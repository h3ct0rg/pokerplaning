import { useSyncExternalStore } from 'react';
import { DEFAULT_SKIN, isSkinId, type SkinId } from './index';

/** Preferencia local (no se envía al servidor). */
export const SKIN_STORAGE_KEY = 'pp.skin';

let current: SkinId | null = null;
const listeners = new Set<() => void>();

function readStored(): SkinId {
  try {
    const v = window.localStorage.getItem(SKIN_STORAGE_KEY);
    return isSkinId(v) ? v : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

export function getSkinId(): SkinId {
  if (current === null) current = readStored();
  return current;
}

export function setSkinId(id: SkinId): void {
  current = isSkinId(id) ? id : DEFAULT_SKIN;
  try {
    window.localStorage.setItem(SKIN_STORAGE_KEY, current);
  } catch {
    /* sin almacenamiento: queda solo en memoria */
  }
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== SKIN_STORAGE_KEY) return;
  current = isSkinId(e.newValue) ? e.newValue : DEFAULT_SKIN;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

/** Skin elegida por este usuario (sincronizada entre pestañas). */
export function useSkin(): SkinId {
  return useSyncExternalStore(subscribe, getSkinId, () => DEFAULT_SKIN);
}

/** Solo para tests: fuerza a releer localStorage. */
export function resetSkinStore(): void {
  current = null;
}
