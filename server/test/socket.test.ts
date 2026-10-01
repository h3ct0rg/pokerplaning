import type { AddressInfo } from 'node:net';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as ioc, type Socket } from 'socket.io-client';
import type { Ack, ClientToServerEvents, RoomState, ServerToClientEvents } from '../../shared/protocol';
import { createApp, type App } from '../src/app';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { last?: RoomState; all: RoomState[] };

let app: App;
let url: string;
const clients: Client[] = [];

async function start(opts = {}) {
  app = createApp(opts);
  await new Promise<void>((r) => app.httpServer.listen(0, r));
  url = `http://localhost:${(app.httpServer.address() as AddressInfo).port}`;
}

function connect(): Promise<Client> {
  const c = ioc(url, { transports: ['websocket'], forceNew: true, reconnection: false }) as Client;
  c.all = [];
  c.on('room:state', (s) => {
    c.last = s;
    c.all.push(s);
  });
  clients.push(c);
  return new Promise((r) => c.on('connect', () => r(c)));
}

/** Espera al primer room:state (o el actual) que cumpla el predicado. */
function waitState(c: Client, pred: (s: RoomState) => boolean): Promise<RoomState> {
  if (c.last && pred(c.last)) return Promise.resolve(c.last);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout esperando room:state')), 2000);
    const h = (s: RoomState) => {
      if (pred(s)) {
        clearTimeout(t);
        c.off('room:state', h);
        resolve(s);
      }
    };
    c.on('room:state', h);
  });
}

const emit = <A extends Ack<any>>(c: Client, ev: string, ...args: unknown[]): Promise<A> =>
  new Promise((r) => (c.emit as any)(ev, ...args, r));

const cid = (i: number) => `secret-cid-${i}`;

async function roomWith(names: string[]) {
  const cs: Client[] = [];
  const owner = await connect();
  const created = await emit<Ack<{ roomId: string }>>(owner, 'room:create', { name: names[0], clientId: cid(0) });
  if (!created.ok) throw new Error(created.error);
  cs.push(owner);
  for (let i = 1; i < names.length; i++) {
    const c = await connect();
    expect(await emit(c, 'room:join', { roomId: created.roomId, name: names[i], clientId: cid(i) })).toEqual({ ok: true });
    cs.push(c);
  }
  await Promise.all(cs.map((c) => waitState(c, (s) => s.participants.length === names.length)));
  return { roomId: created.roomId, cs };
}

beforeEach(async () => {
  await start();
});

afterEach(async () => {
  clients.splice(0).forEach((c) => c.disconnect());
  await app.close();
});

describe('Socket.IO', () => {
  it('room:create devuelve id no adivinable y el creador es owner', async () => {
    const c = await connect();
    const r = await emit<Ack<{ roomId: string }>>(c, 'room:create', { name: 'Ana', clientId: cid(0) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.roomId).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    const s = await waitState(c, (s) => s.id === r.roomId);
    expect(s.selfId.length).toBeGreaterThanOrEqual(12);
    expect(s.ownerId).toBe(s.selfId);
    expect(s.participants[0]).toMatchObject({ id: s.selfId, name: 'Ana', connected: true });
  });

  it('valida entradas y ROOM_NOT_FOUND', async () => {
    const c = await connect();
    expect(await emit(c, 'room:create', { name: '  ', clientId: 'c0' })).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(await emit(c, 'room:join', { roomId: 'noexiste', name: 'Ana', clientId: 'c0' })).toEqual({
      ok: false,
      error: 'ROOM_NOT_FOUND',
    });
    expect(await emit(c, 'vote:cast', { value: '5' })).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
  });

  it('oculta votos ajenos hasta revelar y luego todos los ven', async () => {
    const { cs } = await roomWith(['Ana', 'Bob', 'Cris']);
    const [a, b, c] = cs;
    expect(await emit(b, 'vote:cast', { value: '8' })).toEqual({ ok: true });
    expect(await emit(b, 'vote:cast', { value: '99' })).toEqual({ ok: false, error: 'INVALID_INPUT' });
    const sa = await waitState(a, (s) => s.participants[1].hasVoted);
    const sc = await waitState(c, (s) => s.participants[1].hasVoted);
    const sb = await waitState(b, (s) => s.participants[1].hasVoted);
    expect(sa.participants[1].vote).toBeNull();
    expect(sc.participants[1].vote).toBeNull();
    expect(sb.participants[1].vote).toBe('8');

    expect(await emit(a, 'round:reveal')).toEqual({ ok: true });
    for (const cl of cs) {
      const s = await waitState(cl, (s) => s.revealed);
      expect(s.participants[1].vote).toBe('8');
    }

    expect(await emit(b, 'vote:cast', { value: '3' })).toEqual({ ok: false, error: 'INVALID_INPUT' }); // D6

    expect(await emit(a, 'round:reset')).toEqual({ ok: true });
    const r = await waitState(c, (s) => !s.revealed && !s.participants[1].hasVoted);
    expect(r.participants[1].vote).toBeNull();
  });

  it('acciones de owner devuelven NOT_OWNER a no-owners', async () => {
    const { cs } = await roomWith(['Ana', 'Bob']);
    const [a, b] = cs;
    expect(await emit(b, 'round:reveal')).toEqual({ ok: false, error: 'NOT_OWNER' });
    expect(await emit(b, 'round:reset')).toEqual({ ok: false, error: 'NOT_OWNER' });
    expect(await emit(b, 'story:add', { title: 'x' })).toEqual({ ok: false, error: 'NOT_OWNER' });
    expect(await emit(b, 'round:confirm', { estimate: '5' })).toEqual({ ok: false, error: 'NOT_OWNER' });
    expect(await emit(b, 'deck:set', { deckId: 'tshirt' })).toEqual({ ok: false, error: 'NOT_OWNER' });
    const bPub = b.last!.selfId;
    expect(await emit(b, 'owner:transfer', { participantId: bPub })).toEqual({ ok: false, error: 'NOT_OWNER' });

    const added = await emit<Ack<{ storyId: string }>>(a, 'story:add', { title: 'HU-1', key: 'core-1' });
    expect(added.ok).toBe(true);
    const storyId = added.ok ? added.storyId : '';
    for (const [ev, payload] of [
      ['story:update', { storyId, title: 'x' }],
      ['story:remove', { storyId }],
      ['story:select', { storyId }],
    ] as const) {
      expect(await emit(b, ev, payload)).toEqual({ ok: false, error: 'NOT_OWNER' });
    }
    expect(await emit(a, 'deck:set', { deckId: 'tshirt' })).toEqual({ ok: true });
    const s = await waitState(b, (s) => s.currentStoryId === storyId && s.deckId === 'tshirt');
    expect(s.stories[0]).toMatchObject({ key: 'CORE-1', title: 'HU-1' });
    expect(s.deck).toContain('XXL');

    expect(await emit(b, 'name:change', { name: 'Roberto' })).toEqual({ ok: true });
    await waitState(a, (s) => s.participants[1].name === 'Roberto');

    expect(await emit(a, 'owner:transfer', { participantId: cid(1) })).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(await emit(a, 'owner:transfer', { participantId: bPub })).toEqual({ ok: true });
    await waitState(b, (s) => s.ownerId === bPub);
    expect(await emit(b, 'round:reveal')).toEqual({ ok: true });
  });

  it('reconexión con misma clientId conserva voto y rol de owner; dos pestañas = un participante', async () => {
    const { roomId, cs } = await roomWith(['Ana', 'Bob']);
    const [a, b] = cs;
    const pubA = a.last!.selfId;
    await emit(a, 'vote:cast', { value: '3' });

    // segunda pestaña de Ana
    const a2 = await connect();
    expect(await emit(a2, 'room:join', { roomId, name: 'Ana', clientId: cid(0) })).toEqual({ ok: true });
    const s2 = await waitState(a2, (s) => s.participants.length === 2);
    expect(s2.participants[0].vote).toBe('3');
    expect(s2.selfId).toBe(pubA);

    a.disconnect();
    await new Promise((r) => setTimeout(r, 50));
    expect(b.last!.participants[0].connected).toBe(true); // sigue a2

    a2.disconnect();
    const off = await waitState(b, (s) => !s.participants[0].connected);
    expect(off.participants[0]).toMatchObject({ hasVoted: true, vote: null });
    expect(off.ownerId).toBe(pubA);

    const a3 = await connect();
    expect(await emit(a3, 'room:join', { roomId, name: 'Ana', clientId: cid(0) })).toEqual({ ok: true });
    const s3 = await waitState(a3, (s) => s.participants[0].connected);
    expect(s3.ownerId).toBe(pubA);
    expect(s3.selfId).toBe(pubA);
    expect(s3.participants[0].vote).toBe('3');
    expect(s3.participants).toHaveLength(2);
    expect(await emit(a3, 'round:reveal')).toEqual({ ok: true });
  });
});

describe('v2', () => {
  it('AC-1 room:join acepta el código en minúsculas y con espacios', async () => {
    const owner = await connect();
    const r = await emit<Ack<{ roomId: string }>>(owner, 'room:create', { name: 'Ana', clientId: cid(0) });
    if (!r.ok) throw new Error(r.error);
    const c = await connect();
    expect(await emit(c, 'room:join', { roomId: `  ${r.roomId.toLowerCase()} `, name: 'Bob', clientId: cid(1) })).toEqual({ ok: true });
    const s = await waitState(c, (s) => s.participants.length === 2);
    expect(s.id).toBe(r.roomId);
    // re-join del mismo socket con otra capitalización no duplica conexión
    expect(await emit(c, 'room:join', { roomId: r.roomId, name: 'Bobby', clientId: cid(1) })).toEqual({ ok: true });
    await waitState(owner, (s) => s.participants[1].name === 'Bobby');
    expect(app.store.get(r.roomId).members.get(cid(1))!.connections).toBe(1);
  });

  it('AC-1 >30 joins fallidos por IP en un minuto → RATE_LIMITED (incluso a salas válidas)', async () => {
    const { roomId } = await roomWith(['Ana']);
    const c = await connect();
    for (let i = 0; i < 30; i++) {
      expect(await emit(c, 'room:join', { roomId: 'ZZZZZZ', name: 'Eve', clientId: 'eve' })).toEqual({ ok: false, error: 'ROOM_NOT_FOUND' });
    }
    expect(await emit(c, 'room:join', { roomId: 'ZZZZZZ', name: 'Eve', clientId: 'eve' })).toEqual({ ok: false, error: 'RATE_LIMITED' });
    expect(await emit(c, 'room:join', { roomId, name: 'Eve', clientId: 'eve' })).toEqual({ ok: false, error: 'RATE_LIMITED' });
  });

  it('V2-D7 reconexión de un participante existente exenta de RATE_LIMITED', async () => {
    const { roomId, cs } = await roomWith(['Ana', 'Bob']);
    const [, b] = cs;
    const c = await connect(); // misma IP (localhost)
    for (let i = 0; i < 30; i++) await emit(c, 'room:join', { roomId: 'ZZZZZZ', name: 'Eve', clientId: 'eve' });
    expect(await emit(c, 'room:join', { roomId, name: 'Eve', clientId: 'eve' })).toEqual({ ok: false, error: 'RATE_LIMITED' });
    b.disconnect();
    const b2 = await connect();
    expect(await emit(b2, 'room:join', { roomId: roomId.toLowerCase(), name: 'Bob', clientId: cid(1) })).toEqual({ ok: true });
    const s = await waitState(b2, (s) => s.participants[1].connected);
    expect(s.selfId).toBe(s.participants[1].id);
  });

  it('AC-3/AC-4/AC-5 flujo de historias, confirmación y cronómetro', async () => {
    const { cs } = await roomWith(['Ana', 'Bob']);
    const [a, b] = cs;
    const id1 = ((await emit(a, 'story:add', { title: 'Uno' })) as any).storyId as string;
    const id2 = ((await emit(a, 'story:add', { title: 'Dos' })) as any).storyId as string;
    expect(await emit(a, 'story:add', { title: '' })).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(await emit(a, 'story:select', { storyId: 'nope' })).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(await emit(a, 'round:confirm', { estimate: '5' })).toEqual({ ok: false, error: 'INVALID_INPUT' });
    await emit(b, 'vote:cast', { value: '½' });
    expect(await emit(a, 'round:reveal')).toEqual({ ok: true });
    const rev = await waitState(b, (s) => s.revealed);
    expect(rev.revealedAt).not.toBeNull();
    expect(rev.revealedAt!).toBeGreaterThanOrEqual(rev.roundStartedAt);
    expect(Math.abs(rev.serverNow - Date.now())).toBeLessThan(1000);
    expect(await emit(a, 'round:confirm', { estimate: '½' })).toEqual({ ok: true });
    const s = await waitState(b, (s) => s.currentStoryId === id2);
    expect(s.stories.find((x) => x.id === id1)).toMatchObject({ estimate: '½' });
    expect(s.revealed).toBe(false);
    expect(s.revealedAt).toBeNull();
    expect(s.participants.every((p) => !p.hasVoted)).toBe(true);
    expect(await emit(a, 'story:update', { storyId: id2, title: 'Dos bis', key: 'k-2' })).toEqual({ ok: true });
    expect(await emit(a, 'story:remove', { storyId: id2 })).toEqual({ ok: true });
    await waitState(b, (s) => s.stories.length === 1 && s.currentStoryId === null);
  });

  it('AC-8 payloads basura no rompen el servidor', async () => {
    const { cs } = await roomWith(['Ana']);
    const [a] = cs;
    for (const ev of ['story:add', 'story:update', 'story:remove', 'story:select', 'round:confirm', 'role:set', 'deck:set']) {
      for (const bad of [null, 123, 'x', { title: 5, storyId: {}, estimate: [], role: 1, deckId: 'proto' }]) {
        expect(await emit(a, ev, bad)).toEqual({ ok: false, error: 'INVALID_INPUT' });
      }
    }
    (a.emit as any)('story:add', { title: 'sin ack' }); // ack ausente
    await waitState(a, (s) => s.stories.length === 1);
  });

  it('AC-6 role:set espectador', async () => {
    const { cs } = await roomWith(['Ana', 'Bob']);
    const [a, b] = cs;
    await emit(b, 'vote:cast', { value: '3' });
    expect(await emit(b, 'role:set', { role: 'spectator' })).toEqual({ ok: true });
    const s = await waitState(a, (s) => s.participants[1].role === 'spectator');
    expect(s.participants[1].hasVoted).toBe(false);
    expect(await emit(b, 'vote:cast', { value: '3' })).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(await emit(b, 'role:set', { role: 'jefe' })).toEqual({ ok: false, error: 'INVALID_INPUT' });
  });

  it('AC-7 el owner desconectado cede el rol tras la gracia y se difunde', async () => {
    await app.close();
    await start({ ownerGraceMs: 100 });
    const { cs } = await roomWith(['Ana', 'Bob', 'Cris']);
    const [a, b, c] = cs;
    const bPub = b.last!.selfId;
    a.disconnect();
    await waitState(c, (s) => !s.participants[0].connected);
    expect(c.last!.ownerId).not.toBe(bPub);
    const s = await waitState(c, (s) => s.ownerId === bPub);
    expect(s.ownerId).toBe(bPub);
    expect(await emit(b, 'round:reveal')).toEqual({ ok: true });
  });
});

describe('Seguridad de identidad (D5/R1) y validación previa (R2)', () => {
  it('ningún room:state contiene un clientId', async () => {
    const { cs } = await roomWith(['Ana', 'Bob', 'Cris']);
    const [a, b] = cs;
    await emit(b, 'vote:cast', { value: '5' });
    await emit(a, 'story:add', { title: 'HU' });
    await emit(a, 'round:reveal');
    await emit(a, 'owner:transfer', { participantId: b.last!.selfId });
    await Promise.all(cs.map((c) => waitState(c, (s) => s.revealed && s.ownerId === b.last!.selfId)));
    for (const c of cs) {
      expect(c.all.length).toBeGreaterThan(0);
      expect(JSON.stringify(c.all)).not.toContain('secret-cid');
    }
  });

  it('unirse con clientId = ownerId público no otorga owner ni votos ajenos', async () => {
    const { roomId, cs } = await roomWith(['Ana', 'Bob']);
    const [a, b] = cs;
    await emit(a, 'vote:cast', { value: '8' });
    const leakedOwnerId = b.last!.ownerId;
    const attacker = await connect();
    expect(await emit(attacker, 'room:join', { roomId, name: 'Eve', clientId: leakedOwnerId })).toEqual({ ok: true });
    const s = await waitState(attacker, (s) => s.participants.length === 3);
    expect(s.ownerId).toBe(a.last!.selfId);
    expect(s.selfId).not.toBe(s.ownerId);
    expect(s.participants[0]).toMatchObject({ hasVoted: true, vote: null });
    expect(await emit(attacker, 'round:reveal')).toEqual({ ok: false, error: 'NOT_OWNER' });
  });

  it('un join inválido no saca al socket de su sala', async () => {
    const { roomId, cs } = await roomWith(['Ana', 'Bob']);
    const [a, b] = cs;
    expect(await emit(b, 'room:join', { roomId, name: '   ', clientId: 'otro' })).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(await emit(b, 'room:join', { roomId, name: 'Bob', clientId: '' })).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(await emit(b, 'room:join', { roomId: 'noexiste', name: 'Bob', clientId: 'x' })).toEqual({ ok: false, error: 'ROOM_NOT_FOUND' });
    expect(await emit(b, 'vote:cast', { value: '5' })).toEqual({ ok: true });
    const s = await waitState(a, (s) => s.participants[1].hasVoted);
    expect(s.participants).toHaveLength(2);
    expect(s.participants[1].connected).toBe(true);
  });
});

describe('HTTP estático', () => {
  it('sirve client/dist con fallback SPA', async () => {
    await app.close();
    const dist = mkdtempSync(path.join(tmpdir(), 'dist-'));
    mkdirSync(path.join(dist, 'assets'));
    writeFileSync(path.join(dist, 'index.html'), '<html>SPA</html>');
    writeFileSync(path.join(dist, 'assets', 'a.js'), 'console.log(1)');
    await start({ clientDist: dist });
    const html = await fetch(`${url}/room/abc123xyz`, { headers: { accept: 'text/html' } });
    expect(await html.text()).toContain('SPA');
    const js = await fetch(`${url}/assets/a.js`);
    expect(await js.text()).toContain('console.log');
  });
});
