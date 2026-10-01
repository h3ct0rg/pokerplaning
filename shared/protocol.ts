// Contrato compartido cliente/servidor (Socket.IO) v2. No cambiar tipos ni nombres.
export const PROTOCOL_VERSION = 2;
export const DECKS = {
  fibonacci: ['0', '½', '1', '2', '3', '5', '8', '13', '21', '?', '☕'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
} as const;
export type DeckId = keyof typeof DECKS;
export type ParticipantRole = 'player' | 'spectator';

export interface Participant {
  id: string;              // publicId (D5 v1). clientId nunca sale del servidor
  name: string;
  connected: boolean;
  role: ParticipantRole;
  hasVoted: boolean;       // siempre false para spectator
  vote: string | null;     // solo si revealed o si es el receptor
  joinedAt: number;        // epoch ms; orden de la lista y de auto-transferencia
}
export interface Story {
  id: string;              // aleatorio del servidor
  key: string;             // opcional ('' si no hay), p.ej. CORE-142; ≤20, se guarda en mayúsculas
  title: string;           // 1..200 (trim)
  estimate: string | null; // valor confirmado (∈ mazo vigente al confirmar)
  estimatedAt: number | null;
}
export interface RoomState {
  id: string;              // código de sala de 6 chars (ver AC-1)
  ownerId: string;
  selfId: string;
  deckId: DeckId;
  deck: string[];
  stories: Story[];        // orden de cola
  currentStoryId: string | null;
  revealed: boolean;
  roundStartedAt: number;  // epoch ms servidor
  revealedAt: number | null;
  serverNow: number;       // epoch ms al emitir (el cliente corrige desfase de reloj)
  participants: Participant[]; // ordenados por joinedAt
}
export type Ack<T = {}> = ({ ok: true } & T) | { ok: false; error: ErrorCode };
export type ErrorCode = 'ROOM_NOT_FOUND' | 'INVALID_INPUT' | 'NOT_OWNER' | 'NOT_IN_ROOM' | 'RATE_LIMITED';

export interface ClientToServerEvents {
  'room:create':   (p: { name: string; clientId: string; deckId?: DeckId }, ack: (r: Ack<{ roomId: string }>) => void) => void;
  'room:join':     (p: { roomId: string; name: string; clientId: string }, ack: (r: Ack) => void) => void; // roomId case-insensitive, trim
  'vote:cast':     (p: { value: string | null }, ack?: (r: Ack) => void) => void;   // spectator o revealed → INVALID_INPUT
  'round:reveal':  (ack?: (r: Ack) => void) => void;                                // owner
  'round:reset':   (ack?: (r: Ack) => void) => void;                                // owner: borra votos, revealed=false, roundStartedAt=now
  'round:confirm': (p: { estimate: string }, ack?: (r: Ack) => void) => void;       // owner; requiere revealed && currentStoryId; ver AC-4
  'story:add':     (p: { title: string; key?: string }, ack?: (r: Ack<{ storyId: string }>) => void) => void; // owner; máx 100
  'story:update':  (p: { storyId: string; title: string; key?: string }, ack?: (r: Ack) => void) => void;    // owner
  'story:remove':  (p: { storyId: string }, ack?: (r: Ack) => void) => void;        // owner
  'story:select':  (p: { storyId: string }, ack?: (r: Ack) => void) => void;        // owner; pasa a actual y resetea ronda
  'deck:set':      (p: { deckId: DeckId }, ack?: (r: Ack) => void) => void;         // owner; resetea ronda
  'name:change':   (p: { name: string }, ack?: (r: Ack) => void) => void;
  'role:set':      (p: { role: ParticipantRole }, ack?: (r: Ack) => void) => void;  // propio; a spectator borra su voto
  'owner:transfer':(p: { participantId: string }, ack?: (r: Ack) => void) => void;  // owner
}
export interface ServerToClientEvents {
  'room:state': (s: RoomState) => void; // personalizado por receptor tras cada cambio
}
export const LIMITS = { name: 30, storyTitle: 200, storyKey: 20, stories: 100 } as const;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;
