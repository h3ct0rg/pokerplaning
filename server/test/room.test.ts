import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROOM_CODE_ALPHABET } from '../../shared/protocol';
import { RoomError, RoomStore, generateRoomCode } from '../src/room';
import { RateLimiter } from '../src/rateLimit';

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof RoomError ? e.code : 'OTHER';
  }
  return 'NONE';
};

function setup(opts: ConstructorParameters<typeof RoomStore>[0] = {}) {
  const store = new RoomStore(opts);
  const room = store.create('owner', '  Ana  ');
  store.connect(room.id, 'owner', 'Ana');
  store.connect(room.id, 'bob', 'Bob');
  return { store, room };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('AC-1 código de sala', () => {
  it('6 chars del alfabeto', () => {
    for (let i = 0; i < 50; i++) {
      const c = generateRoomCode();
      expect(c).toHaveLength(6);
      expect([...c].every((ch) => ROOM_CODE_ALPHABET.includes(ch))).toBe(true);
    }
  });

  it('reintenta ante colisión', () => {
    const ids = ['AAAAAA', 'AAAAAA', 'BBBBBB'];
    const store = new RoomStore({ generateId: () => ids.shift()! });
    expect(store.create('a', 'A').id).toBe('AAAAAA');
    expect(store.create('b', 'B').id).toBe('BBBBBB');
  });

  it('busca normalizando trim + mayúsculas', () => {
    const store = new RoomStore({ generateId: () => 'ABC234' });
    store.create('a', 'A');
    expect(store.connect('  abc234 ', 'b', 'B').id).toBe('ABC234');
    expect(code(() => store.connect('zzz', 'b', 'B'))).toBe('ROOM_NOT_FOUND');
  });

  it('RateLimiter bloquea tras el límite y se reinicia con la ventana', () => {
    vi.useFakeTimers();
    const rl = new RateLimiter({ limit: 30, windowMs: 60_000 });
    for (let i = 0; i < 30; i++) {
      expect(rl.isLimited('ip')).toBe(false);
      rl.hit('ip');
    }
    expect(rl.isLimited('ip')).toBe(true);
    expect(rl.isLimited('otra')).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(rl.isLimited('ip')).toBe(false);
  });
});

describe('V2-D7 rate-limit', () => {
  it('purga periódica de IPs caducadas (no solo con >10k)', () => {
    vi.useFakeTimers();
    const rl = new RateLimiter({ limit: 30, windowMs: 60_000 });
    rl.hit('a');
    rl.hit('b');
    expect(rl.size).toBe(2);
    vi.advanceTimersByTime(60_000);
    rl.hit('c');
    expect(rl.size).toBe(1);
  });

  it('isMember reconoce participantes existentes con código normalizado', () => {
    const { store, room } = setup();
    expect(store.isMember(` ${room.id.toLowerCase()} `, 'bob')).toBe(true);
    expect(store.isMember(room.id, 'eve')).toBe(false);
    expect(store.isMember('ZZZZZZ', 'bob')).toBe(false);
    expect(store.isMember(room.id, 5)).toBe(false);
  });
});

describe('AC-2 mazos', () => {
  it('½ en fibonacci y XXL en tshirt; voto ∈ mazo vigente', () => {
    const { store, room } = setup();
    expect(store.view(room, 'owner').deck).toContain('½');
    expect(code(() => store.castVote(room.id, 'bob', '½'))).toBe('NONE');
    expect(code(() => store.castVote(room.id, 'bob', 'XXL'))).toBe('INVALID_INPUT');
    store.setDeck(room.id, 'owner', 'tshirt');
    expect(store.view(room, 'owner').deck).toContain('XXL');
    expect(code(() => store.castVote(room.id, 'bob', 'XXL'))).toBe('NONE');
    expect(code(() => store.castVote(room.id, 'bob', '5'))).toBe('INVALID_INPUT');
  });
});

describe('AC-3 historias', () => {
  it('add valida, guarda key en mayúsculas y la primera pasa a actual sin resetear votos', () => {
    const { store, room } = setup();
    store.castVote(room.id, 'bob', '5');
    expect(code(() => store.addStory(room.id, 'bob', 'x'))).toBe('NOT_OWNER');
    expect(code(() => store.addStory(room.id, 'owner', '  '))).toBe('INVALID_INPUT');
    expect(code(() => store.addStory(room.id, 'owner', 'a'.repeat(201)))).toBe('INVALID_INPUT');
    expect(code(() => store.addStory(room.id, 'owner', 'ok', 'k'.repeat(21)))).toBe('INVALID_INPUT');
    expect(code(() => store.addStory(room.id, 'owner', 'ok', 5))).toBe('INVALID_INPUT');
    const { storyId } = store.addStory(room.id, 'owner', '  Login  ', ' core-142 ');
    const s = store.view(room, 'bob');
    expect(s.stories).toEqual([{ id: storyId, key: 'CORE-142', title: 'Login', estimate: null, estimatedAt: null }]);
    expect(s.currentStoryId).toBe(storyId);
    expect(s.participants[1].vote).toBe('5'); // no reseteó
    const second = store.addStory(room.id, 'owner', 'Otra').storyId;
    expect(store.view(room, 'bob').currentStoryId).toBe(storyId);
    expect(store.view(room, 'bob').stories[1]).toMatchObject({ id: second, key: '' });
  });

  it('máximo 100 historias', () => {
    const { store, room } = setup();
    for (let i = 0; i < 100; i++) store.addStory(room.id, 'owner', `h${i}`);
    expect(code(() => store.addStory(room.id, 'owner', 'extra'))).toBe('INVALID_INPUT');
  });

  it('update / select / remove', () => {
    vi.useFakeTimers();
    const { store, room } = setup();
    const a = store.addStory(room.id, 'owner', 'A').storyId;
    const b = store.addStory(room.id, 'owner', 'B').storyId;
    const c = store.addStory(room.id, 'owner', 'C').storyId;

    store.updateStory(room.id, 'owner', b, 'B2', 'x-1');
    store.updateStory(room.id, 'owner', b, 'B3'); // key omitida se conserva
    expect(room.stories[1]).toMatchObject({ title: 'B3', key: 'X-1' });
    expect(code(() => store.updateStory(room.id, 'owner', 'nope', 'x'))).toBe('INVALID_INPUT');
    expect(code(() => store.updateStory(room.id, 'bob', b, 'x'))).toBe('NOT_OWNER');

    store.castVote(room.id, 'bob', '3');
    vi.advanceTimersByTime(1000);
    store.selectStory(room.id, 'owner', b);
    expect(room.currentStoryId).toBe(b);
    expect(store.view(room, 'bob').participants[1].vote).toBeNull();
    expect(room.roundStartedAt).toBe(Date.now());
    expect(code(() => store.selectStory(room.id, 'owner', 'nope'))).toBe('INVALID_INPUT');

    store.removeStory(room.id, 'owner', a); // no actual: no resetea ni cambia actual
    expect(room.currentStoryId).toBe(b);
    store.castVote(room.id, 'bob', '3');
    store.removeStory(room.id, 'owner', b); // actual → siguiente pendiente
    expect(room.currentStoryId).toBe(c);
    expect(store.view(room, 'bob').participants[1].vote).toBeNull();
    store.removeStory(room.id, 'owner', c);
    expect(room.currentStoryId).toBeNull();
    expect(code(() => store.removeStory(room.id, 'owner', c))).toBe('INVALID_INPUT');
  });

  it('remove de la actual (última) vuelve a una pendiente anterior', () => {
    const { store, room } = setup();
    const a = store.addStory(room.id, 'owner', 'A').storyId;
    const b = store.addStory(room.id, 'owner', 'B').storyId;
    store.selectStory(room.id, 'owner', b);
    store.removeStory(room.id, 'owner', b);
    expect(room.currentStoryId).toBe(a);
  });
});

describe('AC-4 round:confirm', () => {
  it('valida, guarda estimación y avanza en la cola', () => {
    vi.useFakeTimers();
    const { store, room } = setup();
    expect(code(() => store.confirm(room.id, 'owner', '5'))).toBe('INVALID_INPUT'); // sin revelar / sin historia
    const a = store.addStory(room.id, 'owner', 'A').storyId;
    const b = store.addStory(room.id, 'owner', 'B').storyId;
    const c = store.addStory(room.id, 'owner', 'C').storyId;
    expect(code(() => store.confirm(room.id, 'owner', '5'))).toBe('INVALID_INPUT'); // sin revelar
    store.castVote(room.id, 'bob', '5');
    store.reveal(room.id, 'owner');
    expect(code(() => store.confirm(room.id, 'bob', '5'))).toBe('NOT_OWNER');
    expect(code(() => store.confirm(room.id, 'owner', 'XL'))).toBe('INVALID_INPUT');
    vi.advanceTimersByTime(500);
    store.confirm(room.id, 'owner', '5');
    expect(room.stories[0]).toMatchObject({ id: a, estimate: '5', estimatedAt: Date.now() });
    expect(room.currentStoryId).toBe(b);
    expect(room.revealed).toBe(false);
    expect(room.revealedAt).toBeNull();
    expect(room.roundStartedAt).toBe(Date.now());
    expect(store.view(room, 'owner').participants.every((p) => !p.hasVoted)).toBe(true);

    // confirmar la última → vuelve a la primera pendiente anterior
    store.selectStory(room.id, 'owner', c);
    store.reveal(room.id, 'owner');
    store.confirm(room.id, 'owner', '8');
    expect(room.currentStoryId).toBe(b);
    store.reveal(room.id, 'owner');
    store.confirm(room.id, 'owner', '?');
    expect(room.currentStoryId).toBeNull(); // ninguna pendiente
    expect(room.stories.map((s) => s.estimate)).toEqual(['5', '?', '8']);
  });
});

describe('AC-5 cronómetro', () => {
  it('roundStartedAt / revealedAt / serverNow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const { store, room } = setup();
    expect(room.roundStartedAt).toBe(1_000_000);
    vi.advanceTimersByTime(2000);
    store.reveal(room.id, 'owner');
    expect(room.revealedAt).toBe(1_002_000);
    vi.advanceTimersByTime(1000);
    store.reveal(room.id, 'owner'); // idempotente
    expect(room.revealedAt).toBe(1_002_000);
    expect(store.view(room, 'bob').serverNow).toBe(1_003_000);
    store.reset(room.id, 'owner');
    expect(room).toMatchObject({ revealedAt: null, roundStartedAt: 1_003_000 });
    vi.advanceTimersByTime(1000);
    store.setDeck(room.id, 'owner', 'tshirt');
    expect(room.roundStartedAt).toBe(1_004_000);
  });
});

describe('AC-6 espectador', () => {
  it('role:set propio; spectator no vota y pierde su voto', () => {
    const { store, room } = setup();
    store.castVote(room.id, 'bob', '8');
    expect(code(() => store.setRole(room.id, 'bob', 'admin'))).toBe('INVALID_INPUT');
    store.setRole(room.id, 'bob', 'spectator');
    const p = store.view(room, 'bob').participants[1];
    expect(p).toMatchObject({ role: 'spectator', hasVoted: false, vote: null });
    expect(code(() => store.castVote(room.id, 'bob', '8'))).toBe('INVALID_INPUT');
    store.setRole(room.id, 'bob', 'player');
    expect(code(() => store.castVote(room.id, 'bob', '8'))).toBe('NONE');
  });
});

describe('AC-7 auto-transferencia de owner', () => {
  it('pasa al conectado con menor joinedAt, players antes que spectators', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const store = new RoomStore({ ownerGraceMs: 30_000, onChange });
    const room = store.create('owner', 'Ana');
    store.connect(room.id, 'owner', 'Ana');
    vi.advanceTimersByTime(10);
    store.connect(room.id, 'spec', 'Spec');
    store.setRole(room.id, 'spec', 'spectator');
    vi.advanceTimersByTime(10);
    store.connect(room.id, 'p2', 'P2');
    store.disconnect(room.id, 'owner');
    vi.advanceTimersByTime(29_999);
    expect(room.ownerClientId).toBe('owner');
    vi.advanceTimersByTime(1);
    expect(room.ownerClientId).toBe('p2');
    expect(onChange).toHaveBeenCalledWith(room);
  });

  it('se cancela si el owner vuelve dentro de la gracia', () => {
    vi.useFakeTimers();
    const { store, room } = setup({ ownerGraceMs: 1000 });
    store.disconnect(room.id, 'owner');
    vi.advanceTimersByTime(900);
    store.connect(room.id, 'owner', 'Ana');
    vi.advanceTimersByTime(5000);
    expect(room.ownerClientId).toBe('owner');
  });

  it('multi-pestaña: no se programa mientras quede un socket', () => {
    vi.useFakeTimers();
    const { store, room } = setup({ ownerGraceMs: 1000 });
    store.connect(room.id, 'owner', 'Ana');
    store.disconnect(room.id, 'owner');
    vi.advanceTimersByTime(5000);
    expect(room.ownerClientId).toBe('owner');
  });

  it('sin conectados: pasa al primero que conecte tras la gracia; spectator también vale', () => {
    vi.useFakeTimers();
    const { store, room } = setup({ ownerGraceMs: 1000 });
    store.disconnect(room.id, 'bob');
    store.disconnect(room.id, 'owner');
    vi.advanceTimersByTime(1000);
    expect(room.ownerClientId).toBe('owner');
    store.connect(room.id, 'bob', 'Bob');
    expect(room.ownerClientId).toBe('bob');
    store.connect(room.id, 'owner', 'Ana'); // ya no recupera
    expect(room.ownerClientId).toBe('bob');
  });

  it('sin conectados: si el owner es el primero en volver, lo conserva', () => {
    vi.useFakeTimers();
    const { store, room } = setup({ ownerGraceMs: 1000 });
    store.disconnect(room.id, 'bob');
    store.disconnect(room.id, 'owner');
    vi.advanceTimersByTime(2000);
    store.connect(room.id, 'owner', 'Ana');
    store.connect(room.id, 'bob', 'Bob');
    expect(room.ownerClientId).toBe('owner');
  });

  it('transferir manualmente a un desconectado programa su gracia', () => {
    vi.useFakeTimers();
    const { store, room } = setup({ ownerGraceMs: 1000 });
    store.connect(room.id, 'carl', 'Carl');
    store.disconnect(room.id, 'carl');
    store.transferOwner(room.id, 'owner', store.publicIdOf(room, 'carl'));
    vi.advanceTimersByTime(1000);
    expect(room.ownerClientId).toBe('owner'); // vuelve al conectado más antiguo
  });
});

describe('AC-8 garantías v1', () => {
  it('crea sala con owner y nombre recortado; ids públicos', () => {
    const { store, room } = setup();
    const s = store.view(room, 'owner');
    expect(s.ownerId).toBe(store.publicIdOf(room, 'owner'));
    expect(s.selfId).toBe(s.ownerId);
    expect(s.ownerId.length).toBeGreaterThanOrEqual(12);
    expect(JSON.stringify(store.view(room, 'bob'))).not.toMatch(/"(owner|bob)"/);
    expect(s.participants.map((p) => p.name)).toEqual(['Ana', 'Bob']);
    expect(s.participants.every((p) => p.connected && p.role === 'player')).toBe(true);
  });

  it('valida nombre y payloads basura', () => {
    const { store, room } = setup();
    expect(code(() => store.create('x', '   '))).toBe('INVALID_INPUT');
    expect(code(() => store.create('x', 'a'.repeat(31)))).toBe('INVALID_INPUT');
    expect(code(() => store.create('x', 'ok', 'nope'))).toBe('INVALID_INPUT');
    expect(code(() => store.create('', 'ok'))).toBe('INVALID_INPUT');
    expect(code(() => store.create({}, 'ok'))).toBe('INVALID_INPUT');
    expect(code(() => store.castVote(room.id, 'bob', 5))).toBe('INVALID_INPUT');
    expect(code(() => store.castVote(room.id, 'bob', null))).toBe('NONE');
    expect(code(() => store.connect(42, 'bob', 'Bob'))).toBe('ROOM_NOT_FOUND');
    expect(code(() => store.castVote(room.id, 'ghost', '5'))).toBe('NOT_IN_ROOM');
  });

  it('oculta votos ajenos hasta revelar; tras revelar no se vota', () => {
    const { store, room } = setup();
    store.castVote(room.id, 'bob', '8');
    expect(store.view(room, 'owner').participants[1]).toMatchObject({ hasVoted: true, vote: null });
    expect(store.view(room, 'bob').participants[1].vote).toBe('8');
    store.reveal(room.id, 'owner');
    expect(store.view(room, 'owner').participants[1].vote).toBe('8');
    expect(code(() => store.castVote(room.id, 'bob', '3'))).toBe('INVALID_INPUT');
  });

  it('solo el owner ejecuta acciones de owner', () => {
    const { store, room } = setup();
    expect(code(() => store.reveal(room.id, 'bob'))).toBe('NOT_OWNER');
    expect(code(() => store.reset(room.id, 'bob'))).toBe('NOT_OWNER');
    expect(code(() => store.setDeck(room.id, 'bob', 'tshirt'))).toBe('NOT_OWNER');
    expect(code(() => store.selectStory(room.id, 'bob', 'x'))).toBe('NOT_OWNER');
    expect(code(() => store.removeStory(room.id, 'bob', 'x'))).toBe('NOT_OWNER');
    const bobPub = store.publicIdOf(room, 'bob')!;
    expect(code(() => store.transferOwner(room.id, 'bob', bobPub))).toBe('NOT_OWNER');
    expect(code(() => store.transferOwner(room.id, 'owner', 'bob'))).toBe('INVALID_INPUT'); // clientId no vale
    store.transferOwner(room.id, 'owner', bobPub);
    expect(room.ownerClientId).toBe('bob');
    expect(code(() => store.reveal(room.id, 'owner'))).toBe('NOT_OWNER');
  });

  it('varias conexiones por clientId = un participante; reconexión conserva voto', () => {
    const { store, room } = setup();
    store.castVote(room.id, 'bob', '5');
    store.connect(room.id, 'bob', 'Bob'); // segunda pestaña
    expect(room.members.size).toBe(2);
    store.disconnect(room.id, 'bob');
    expect(store.view(room, 'x').participants[1].connected).toBe(true);
    store.disconnect(room.id, 'bob');
    expect(store.view(room, 'x').participants[1]).toMatchObject({ connected: false, hasVoted: true });
    store.connect(room.id, 'bob', 'Bob');
    expect(store.view(room, 'bob').participants[1]).toMatchObject({ connected: true, vote: '5' });
  });

  it('elimina la sala sin conectados tras el TTL y cancela si alguien vuelve', () => {
    vi.useFakeTimers();
    const store = new RoomStore({ emptyRoomTtlMs: 1000 });
    const room = store.create('owner', 'Ana');
    store.connect(room.id, 'owner', 'Ana');
    store.disconnect(room.id, 'owner');
    vi.advanceTimersByTime(999);
    store.connect(room.id, 'owner', 'Ana');
    vi.advanceTimersByTime(5000);
    expect(store.has(room.id)).toBe(true);
    store.disconnect(room.id, 'owner');
    vi.advanceTimersByTime(1000);
    expect(store.has(room.id)).toBe(false);
  });

  it('TTL por defecto de 30 min', () => {
    vi.useFakeTimers();
    const store = new RoomStore();
    const room = store.create('owner', 'Ana');
    vi.advanceTimersByTime(30 * 60 * 1000 - 1);
    expect(store.has(room.id)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(store.has(room.id)).toBe(false);
  });
});
