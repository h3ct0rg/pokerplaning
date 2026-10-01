// Lógica de salas pura (sin transporte). El servidor Socket.IO solo traduce eventos a estas operaciones.
import { randomBytes, randomInt } from 'node:crypto';
import {
  DECKS,
  LIMITS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type DeckId,
  type ErrorCode,
  type ParticipantRole,
  type RoomState,
  type Story,
} from '../../shared/protocol';

export const DEFAULT_EMPTY_ROOM_TTL_MS = 30 * 60 * 1000;
export const DEFAULT_OWNER_GRACE_MS = 30 * 1000;
const CLIENT_ID_MAX = 100;

type Timer = ReturnType<typeof setTimeout>;

interface Member {
  id: string; // clientId (secreto)
  publicId: string; // id expuesto en Participant.id/ownerId
  name: string;
  role: ParticipantRole;
  vote: string | null;
  connections: number;
  joinedAt: number;
}

export interface Room {
  id: string;
  ownerClientId: string; // secreto: nunca se envía
  deckId: DeckId;
  stories: Story[];
  currentStoryId: string | null;
  revealed: boolean;
  roundStartedAt: number;
  revealedAt: number | null;
  members: Map<string, Member>;
  cleanupTimer?: Timer;
  ownerTimer?: Timer;
  /** La gracia del owner venció sin nadie conectado: el próximo en conectar será owner. */
  ownerTransferPending: boolean;
}

export class RoomError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
  }
}

// ---------- validación ----------
const fail = (): never => {
  throw new RoomError('INVALID_INPUT');
};

export function normalizeName(name: unknown): string {
  if (typeof name !== 'string') return fail();
  const n = name.trim();
  if (n.length < 1 || n.length > LIMITS.name) fail();
  return n;
}

export function validateClientId(clientId: unknown): string {
  if (typeof clientId !== 'string' || clientId.length < 1 || clientId.length > CLIENT_ID_MAX) fail();
  return clientId as string;
}

export function normalizeStoryTitle(title: unknown): string {
  if (typeof title !== 'string') return fail();
  const t = title.trim();
  if (t.length < 1 || t.length > LIMITS.storyTitle) fail();
  return t;
}

export function normalizeStoryKey(key: unknown): string {
  if (key === undefined || key === null) return '';
  if (typeof key !== 'string') return fail();
  const k = key.trim().toUpperCase();
  if (k.length > LIMITS.storyKey) fail();
  return k;
}

export function normalizeRoomCode(code: unknown): string | undefined {
  return typeof code === 'string' ? code.trim().toUpperCase() : undefined;
}

export function isDeckId(deckId: unknown): deckId is DeckId {
  return typeof deckId === 'string' && Object.prototype.hasOwnProperty.call(DECKS, deckId);
}

const inDeck = (deckId: DeckId, value: unknown): value is string =>
  typeof value === 'string' && (DECKS[deckId] as readonly string[]).includes(value);

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  return code;
}

export function generatePublicId(): string {
  return randomBytes(12).toString('base64url'); // 16 chars
}

const generateStoryId = () => randomBytes(9).toString('base64url');

// ---------- store ----------
export interface RoomStoreOptions {
  emptyRoomTtlMs?: number;
  ownerGraceMs?: number;
  generateId?: () => string;
  now?: () => number;
  /** Notifica cambios originados por temporizadores (auto-transferencia de owner). */
  onChange?: (room: Room) => void;
}

export class RoomStore {
  private rooms = new Map<string, Room>();
  readonly emptyRoomTtlMs: number;
  readonly ownerGraceMs: number;
  private generateId: () => string;
  private now: () => number;
  onChange?: (room: Room) => void;

  constructor(opts: RoomStoreOptions = {}) {
    this.emptyRoomTtlMs = opts.emptyRoomTtlMs ?? DEFAULT_EMPTY_ROOM_TTL_MS;
    this.ownerGraceMs = opts.ownerGraceMs ?? DEFAULT_OWNER_GRACE_MS;
    this.generateId = opts.generateId ?? generateRoomCode;
    this.now = opts.now ?? Date.now;
    this.onChange = opts.onChange;
  }

  get size(): number {
    return this.rooms.size;
  }

  has(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  /** true si clientId ya es participante de la sala (reconexión). */
  isMember(roomId: unknown, clientId: unknown): boolean {
    const code = normalizeRoomCode(roomId);
    return !!code && typeof clientId === 'string' && !!this.rooms.get(code)?.members.has(clientId);
  }

  /** Busca por código (trim + mayúsculas). */
  get(roomId: unknown): Room {
    const code = normalizeRoomCode(roomId);
    const room = code ? this.rooms.get(code) : undefined;
    if (!room) throw new RoomError('ROOM_NOT_FOUND');
    return room;
  }

  /** Crea una sala con el creador como owner. No lo conecta (ver connect). */
  create(clientId: unknown, name: unknown, deckId?: unknown): Room {
    const id = validateClientId(clientId);
    const n = normalizeName(name);
    if (deckId !== undefined && !isDeckId(deckId)) fail();
    let roomId = this.generateId();
    while (this.rooms.has(roomId)) roomId = this.generateId(); // reintento ante colisión
    const room: Room = {
      id: roomId,
      ownerClientId: id,
      deckId: (deckId as DeckId | undefined) ?? 'fibonacci',
      stories: [],
      currentStoryId: null,
      revealed: false,
      roundStartedAt: this.now(),
      revealedAt: null,
      members: new Map([[id, this.newMember(id, n)]]),
      ownerTransferPending: false,
    };
    this.rooms.set(roomId, room);
    this.scheduleCleanupIfEmpty(room); // por si el creador nunca llega a conectarse
    return room;
  }

  /** Une (o re-une) a un participante y suma una conexión. Conserva voto y rol. */
  connect(roomId: unknown, clientId: unknown, name: unknown): Room {
    const id = validateClientId(clientId);
    const n = normalizeName(name);
    const room = this.get(roomId);
    let m = room.members.get(id);
    if (!m) {
      m = this.newMember(id, n);
      room.members.set(id, m);
    } else {
      m.name = n;
    }
    m.connections++;
    this.clearCleanup(room);
    if (id === room.ownerClientId) {
      this.clearOwnerTimer(room); // el owner volvió dentro de la gracia
      room.ownerTransferPending = false;
    } else if (room.ownerTransferPending) {
      room.ownerTransferPending = false;
      room.ownerClientId = id; // primero en conectar tras vencer la gracia
    }
    return room;
  }

  /** Resta una conexión; programa auto-transferencia de owner y limpieza si corresponde. */
  disconnect(roomId: string, clientId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    const m = room?.members.get(clientId);
    if (!room || !m) return room;
    m.connections = Math.max(0, m.connections - 1);
    if (m.connections === 0 && clientId === room.ownerClientId) this.scheduleOwnerTransfer(room);
    this.scheduleCleanupIfEmpty(room);
    return room;
  }

  castVote(roomId: string, clientId: string, value: unknown): Room {
    const { room, member } = this.member(roomId, clientId);
    if (room.revealed || member.role === 'spectator') fail();
    if (value !== null && !inDeck(room.deckId, value)) fail();
    member.vote = value as string | null;
    return room;
  }

  reveal(roomId: string, clientId: string): Room {
    const room = this.owned(roomId, clientId);
    if (!room.revealed) {
      room.revealed = true;
      room.revealedAt = this.now();
    }
    return room;
  }

  reset(roomId: string, clientId: string): Room {
    const room = this.owned(roomId, clientId);
    this.resetRound(room);
    return room;
  }

  confirm(roomId: string, clientId: string, estimate: unknown): Room {
    const room = this.owned(roomId, clientId);
    if (!room.revealed || room.currentStoryId === null || !inDeck(room.deckId, estimate)) fail();
    const idx = room.stories.findIndex((s) => s.id === room.currentStoryId);
    const story = room.stories[idx];
    story.estimate = estimate as string;
    story.estimatedAt = this.now();
    room.currentStoryId = this.nextPending(room.stories, idx);
    this.resetRound(room);
    return room;
  }

  addStory(roomId: string, clientId: string, title: unknown, key?: unknown): { room: Room; storyId: string } {
    const room = this.owned(roomId, clientId);
    if (room.stories.length >= LIMITS.stories) fail();
    const story: Story = {
      id: generateStoryId(),
      key: normalizeStoryKey(key),
      title: normalizeStoryTitle(title),
      estimate: null,
      estimatedAt: null,
    };
    room.stories.push(story);
    if (room.currentStoryId === null) room.currentStoryId = story.id; // sin resetear votos
    return { room, storyId: story.id };
  }

  updateStory(roomId: string, clientId: string, storyId: unknown, title: unknown, key?: unknown): Room {
    const room = this.owned(roomId, clientId);
    const story = this.story(room, storyId);
    const t = normalizeStoryTitle(title);
    const k = key === undefined ? story.key : normalizeStoryKey(key);
    story.title = t;
    story.key = k;
    return room;
  }

  removeStory(roomId: string, clientId: string, storyId: unknown): Room {
    const room = this.owned(roomId, clientId);
    const story = this.story(room, storyId);
    const idx = room.stories.indexOf(story);
    room.stories.splice(idx, 1);
    if (room.currentStoryId === story.id) {
      // tras el splice, idx apunta a la siguiente: buscamos desde idx-1
      room.currentStoryId = this.nextPending(room.stories, idx - 1);
      this.resetRound(room);
    }
    return room;
  }

  selectStory(roomId: string, clientId: string, storyId: unknown): Room {
    const room = this.owned(roomId, clientId);
    room.currentStoryId = this.story(room, storyId).id;
    this.resetRound(room);
    return room;
  }

  setDeck(roomId: string, clientId: string, deckId: unknown): Room {
    const room = this.owned(roomId, clientId);
    if (!isDeckId(deckId)) fail();
    room.deckId = deckId as DeckId;
    this.resetRound(room);
    return room;
  }

  changeName(roomId: string, clientId: string, name: unknown): Room {
    const { room, member } = this.member(roomId, clientId);
    member.name = normalizeName(name);
    return room;
  }

  setRole(roomId: string, clientId: string, role: unknown): Room {
    const { room, member } = this.member(roomId, clientId);
    if (role !== 'player' && role !== 'spectator') fail();
    member.role = role as ParticipantRole;
    if (role === 'spectator') member.vote = null;
    return room;
  }

  /** participantId es el publicId del destino. */
  transferOwner(roomId: string, clientId: string, participantId: unknown): Room {
    const room = this.owned(roomId, clientId);
    const target =
      typeof participantId === 'string'
        ? [...room.members.values()].find((m) => m.publicId === participantId)
        : undefined;
    if (!target) return fail();
    room.ownerClientId = target.id;
    this.clearOwnerTimer(room);
    room.ownerTransferPending = false;
    if (target.connections === 0) this.scheduleOwnerTransfer(room);
    return room;
  }

  /** publicId del participante con ese clientId (o undefined). */
  publicIdOf(room: Room, clientId: string): string | undefined {
    return room.members.get(clientId)?.publicId;
  }

  /**
   * Estado personalizado para el receptor (clientId): votos ajenos ocultos (null) hasta revelar.
   * Solo expone publicIds; ningún clientId sale de aquí.
   */
  view(room: Room, viewerId: string): RoomState {
    return {
      id: room.id,
      ownerId: room.members.get(room.ownerClientId)?.publicId ?? '',
      selfId: room.members.get(viewerId)?.publicId ?? '',
      deckId: room.deckId,
      deck: [...DECKS[room.deckId]],
      stories: room.stories.map((s) => ({ ...s })),
      currentStoryId: room.currentStoryId,
      revealed: room.revealed,
      roundStartedAt: room.roundStartedAt,
      revealedAt: room.revealedAt,
      serverNow: this.now(),
      participants: this.sortedMembers(room).map((m) => ({
        id: m.publicId,
        name: m.name,
        connected: m.connections > 0,
        role: m.role,
        hasVoted: m.role === 'player' && m.vote !== null,
        vote: room.revealed || m.id === viewerId ? m.vote : null,
        joinedAt: m.joinedAt,
      })),
    };
  }

  /** Cancela todos los temporizadores (cierre del servidor / tests). */
  dispose(): void {
    for (const room of this.rooms.values()) {
      this.clearCleanup(room);
      this.clearOwnerTimer(room);
    }
    this.rooms.clear();
  }

  // ---------- internos ----------
  private newMember(id: string, name: string): Member {
    return { id, publicId: generatePublicId(), name, role: 'player', vote: null, connections: 0, joinedAt: this.now() };
  }

  private sortedMembers(room: Room): Member[] {
    return [...room.members.values()].sort((a, b) => a.joinedAt - b.joinedAt); // sort estable
  }

  private member(roomId: string, clientId: string): { room: Room; member: Member } {
    const room = this.get(roomId);
    const member = room.members.get(clientId);
    if (!member) throw new RoomError('NOT_IN_ROOM');
    return { room, member };
  }

  private owned(roomId: string, clientId: string): Room {
    const { room } = this.member(roomId, clientId);
    if (room.ownerClientId !== clientId) throw new RoomError('NOT_OWNER');
    return room;
  }

  private story(room: Room, storyId: unknown): Story {
    const story = typeof storyId === 'string' ? room.stories.find((s) => s.id === storyId) : undefined;
    if (!story) return fail();
    return story;
  }

  /** Primera historia sin estimación después de `idx`; si no hay, la primera pendiente anterior; si no, null. */
  private nextPending(stories: Story[], idx: number): string | null {
    const after = stories.slice(idx + 1).find((s) => s.estimate === null);
    const before = stories.slice(0, Math.max(0, idx + 1)).find((s) => s.estimate === null);
    return (after ?? before)?.id ?? null;
  }

  private resetRound(room: Room): void {
    room.revealed = false;
    room.revealedAt = null;
    room.roundStartedAt = this.now();
    for (const m of room.members.values()) m.vote = null;
  }

  private scheduleOwnerTransfer(room: Room): void {
    this.clearOwnerTimer(room);
    room.ownerTimer = setTimeout(() => {
      room.ownerTimer = undefined;
      if (this.rooms.get(room.id) !== room) return;
      const owner = room.members.get(room.ownerClientId);
      if (owner && owner.connections > 0) return;
      const candidate = this.sortedMembers(room)
        .filter((m) => m.connections > 0)
        .sort((a, b) => (a.role === b.role ? 0 : a.role === 'player' ? -1 : 1))[0];
      if (candidate) {
        room.ownerClientId = candidate.id;
        this.onChange?.(room);
      } else {
        room.ownerTransferPending = true;
      }
    }, this.ownerGraceMs);
    room.ownerTimer.unref?.();
  }

  private clearOwnerTimer(room: Room): void {
    if (room.ownerTimer) clearTimeout(room.ownerTimer);
    room.ownerTimer = undefined;
  }

  private clearCleanup(room: Room): void {
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    room.cleanupTimer = undefined;
  }

  private scheduleCleanupIfEmpty(room: Room): void {
    const anyConnected = [...room.members.values()].some((m) => m.connections > 0);
    if (anyConnected || room.cleanupTimer) return;
    room.cleanupTimer = setTimeout(() => {
      room.cleanupTimer = undefined;
      if (this.rooms.get(room.id) !== room) return;
      this.clearOwnerTimer(room);
      this.rooms.delete(room.id);
    }, this.emptyRoomTtlMs);
    room.cleanupTimer.unref?.();
  }
}
