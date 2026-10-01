// Transporte: Express (estáticos + SPA) y Socket.IO tipado con el contrato compartido.
import { existsSync } from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import path from 'node:path';
import express from 'express';
import { Server, type Socket } from 'socket.io';
import type { Ack, ClientToServerEvents, ServerToClientEvents } from '../../shared/protocol';
import { RateLimiter } from './rateLimit';
import { normalizeName, normalizeRoomCode, RoomError, RoomStore, validateClientId, type Room } from './room';

interface SocketData {
  roomId?: string;
  clientId?: string;
}

export type IoServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export interface AppOptions {
  clientDist?: string;
  emptyRoomTtlMs?: number;
  ownerGraceMs?: number;
  corsOrigin?: string | string[];
  /** Fallos de room:join (ROOM_NOT_FOUND) permitidos por IP y ventana antes de RATE_LIMITED. */
  joinFailLimit?: number;
  joinFailWindowMs?: number;
  /** Usar X-Forwarded-For como IP del cliente (detrás de un proxy de confianza). */
  trustProxy?: boolean;
}

export interface App {
  httpServer: HttpServer;
  io: IoServer;
  store: RoomStore;
  close: () => Promise<void>;
}

export function createApp(opts: AppOptions = {}): App {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  const dist = opts.clientDist;
  if (dist && existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { index: 'index.html' }));
    // Fallback SPA: cualquier GET que acepte HTML y no sea socket.io → index.html
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/socket.io') || !req.accepts('html')) return next();
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  const httpServer = createServer(app);
  const io: IoServer = new Server(httpServer, opts.corsOrigin ? { cors: { origin: opts.corsOrigin } } : {});
  const store = new RoomStore({ emptyRoomTtlMs: opts.emptyRoomTtlMs, ownerGraceMs: opts.ownerGraceMs });
  const joinLimiter = new RateLimiter({ limit: opts.joinFailLimit ?? 30, windowMs: opts.joinFailWindowMs ?? 60_000 });

  const clientIp = (socket: IoSocket): string => {
    if (opts.trustProxy) {
      const xff = socket.handshake.headers['x-forwarded-for'];
      const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
      if (first) return first;
    }
    return socket.handshake.address;
  };

  const broadcast = (room: Room) => {
    const ids = io.sockets.adapter.rooms.get(room.id);
    if (!ids) return;
    for (const sid of ids) {
      const s = io.sockets.sockets.get(sid);
      if (s?.data.clientId) s.emit('room:state', store.view(room, s.data.clientId));
    }
  };
  store.onChange = broadcast; // auto-transferencia de owner por temporizador

  const reply = <T extends object>(ack: unknown, fn: () => T) => {
    let result: Ack<T>;
    try {
      result = { ok: true, ...fn() };
    } catch (e) {
      if (!(e instanceof RoomError)) console.error(e);
      result = { ok: false, error: e instanceof RoomError ? e.code : 'INVALID_INPUT' };
    }
    if (typeof ack === 'function') ack(result);
  };

  const leaveCurrent = (socket: IoSocket) => {
    const { roomId, clientId } = socket.data;
    if (!roomId || !clientId) return;
    socket.leave(roomId);
    socket.data.roomId = undefined;
    const room = store.disconnect(roomId, clientId);
    if (room) broadcast(room);
  };

  const enter = (socket: IoSocket, rawRoomId: unknown, clientId: unknown, name: unknown): Room => {
    const roomId = normalizeRoomCode(rawRoomId);
    if (roomId && socket.data.roomId === roomId && socket.data.clientId === clientId) {
      // mismo socket re-uniéndose a la misma sala: solo actualiza nombre
      return store.changeName(roomId, clientId as string, name);
    }
    // R2: validar todo antes de abandonar la sala actual
    validateClientId(clientId);
    normalizeName(name);
    store.get(roomId);
    leaveCurrent(socket);
    const room = store.connect(roomId, clientId, name);
    socket.data.roomId = room.id;
    socket.data.clientId = clientId as string;
    socket.join(room.id);
    return room;
  };

  /** Ejecuta una acción sobre la sala del socket y difunde el nuevo estado. */
  const inRoom = (socket: IoSocket, ack: unknown, action: (roomId: string, clientId: string) => Room) =>
    reply(ack, () => {
      const { roomId, clientId } = socket.data;
      if (!roomId || !clientId) throw new RoomError('NOT_IN_ROOM');
      broadcast(action(roomId, clientId));
      return {};
    });

  io.on('connection', (socket) => {
    socket.on('room:create', (p, ack) =>
      reply(ack, () => {
        const room = store.create(p?.clientId, p?.name, p?.deckId);
        enter(socket, room.id, p.clientId, p.name);
        broadcast(room);
        return { roomId: room.id };
      }),
    );

    socket.on('room:join', (p, ack) =>
      reply(ack, () => {
        const ip = clientIp(socket);
        // V2-D7: la reconexión de un participante existente está exenta (el atacante no conoce clientIds)
        if (!store.isMember(p?.roomId, p?.clientId) && joinLimiter.isLimited(ip)) {
          throw new RoomError('RATE_LIMITED');
        }
        try {
          broadcast(enter(socket, p?.roomId, p?.clientId, p?.name));
        } catch (e) {
          if (e instanceof RoomError && e.code === 'ROOM_NOT_FOUND') joinLimiter.hit(ip);
          throw e;
        }
        return {};
      }),
    );

    socket.on('vote:cast', (p, ack) => inRoom(socket, ack, (r, c) => store.castVote(r, c, p?.value)));
    socket.on('round:reveal', (ack) => inRoom(socket, ack, (r, c) => store.reveal(r, c)));
    socket.on('round:reset', (ack) => inRoom(socket, ack, (r, c) => store.reset(r, c)));
    socket.on('round:confirm', (p, ack) => inRoom(socket, ack, (r, c) => store.confirm(r, c, p?.estimate)));
    socket.on('story:add', (p, ack) =>
      reply(ack, () => {
        const { roomId, clientId } = socket.data;
        if (!roomId || !clientId) throw new RoomError('NOT_IN_ROOM');
        const { room, storyId } = store.addStory(roomId, clientId, p?.title, p?.key);
        broadcast(room);
        return { storyId };
      }),
    );
    socket.on('story:update', (p, ack) =>
      inRoom(socket, ack, (r, c) => store.updateStory(r, c, p?.storyId, p?.title, p?.key)),
    );
    socket.on('story:remove', (p, ack) => inRoom(socket, ack, (r, c) => store.removeStory(r, c, p?.storyId)));
    socket.on('story:select', (p, ack) => inRoom(socket, ack, (r, c) => store.selectStory(r, c, p?.storyId)));
    socket.on('role:set', (p, ack) => inRoom(socket, ack, (r, c) => store.setRole(r, c, p?.role)));
    socket.on('deck:set', (p, ack) => inRoom(socket, ack, (r, c) => store.setDeck(r, c, p?.deckId)));
    socket.on('name:change', (p, ack) => inRoom(socket, ack, (r, c) => store.changeName(r, c, p?.name)));
    socket.on('owner:transfer', (p, ack) =>
      inRoom(socket, ack, (r, c) => store.transferOwner(r, c, p?.participantId)),
    );

    socket.on('disconnect', () => leaveCurrent(socket));
  });

  const close = () =>
    new Promise<void>((resolve) => {
      store.dispose();
      io.close(() => resolve());
    });

  return { httpServer, io, store, close };
}
