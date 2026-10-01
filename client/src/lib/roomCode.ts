import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@shared/protocol';

const CODE_RE = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export function isValidRoomCode(code: string): boolean {
  return CODE_RE.test(code);
}

export function normalizeRoomCode(code: string): string {
  return code.trim().replace(/^#/, '').toUpperCase();
}

/**
 * Acepta un código ("ab7k9x", "#AB7K9X") o un link completo
 * (".../r/AB7K9X", ".../room/AB7K9X", con o sin query/hash).
 * Devuelve el código normalizado o null si no es válido.
 */
export function parseRoomInput(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const fromPath = raw.match(/\/(?:r|room)\/([^/?#\s]+)/i);
  const candidate = normalizeRoomCode(fromPath ? decodeURIComponent(fromPath[1]) : raw);
  return isValidRoomCode(candidate) ? candidate : null;
}

export function roomPath(code: string): string {
  return `/r/${encodeURIComponent(code)}`;
}

export function roomUrl(code: string, origin: string = window.location.origin): string {
  return `${origin}${roomPath(code)}`;
}
