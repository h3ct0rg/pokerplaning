import { LIMITS } from '@shared/protocol';

const CLIENT_ID_KEY = 'pp:clientId';
const NAME_KEY = 'pp:name';

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* almacenamiento no disponible: se usa solo en memoria */
  }
}

function randomId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

let memoryClientId: string | null = null;

/** Identificador persistente del navegador (compartido entre pestañas). */
export function getClientId(): string {
  const stored = safeGet(CLIENT_ID_KEY);
  if (stored) return stored;
  if (!memoryClientId) memoryClientId = randomId();
  safeSet(CLIENT_ID_KEY, memoryClientId);
  return memoryClientId;
}

export function getSavedName(): string {
  return safeGet(NAME_KEY) ?? '';
}

export function saveName(name: string): void {
  safeSet(NAME_KEY, name.trim());
}

/** Devuelve un mensaje de error en español o null si el nombre es válido. */
export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Escribe tu nombre.';
  if (trimmed.length > LIMITS.name) return `Máximo ${LIMITS.name} caracteres.`;
  return null;
}
