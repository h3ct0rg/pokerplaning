import type { CSSProperties } from 'react';
import { classic } from './classic';
import { creatures } from './creatures';
import { futuristic } from './futuristic';
import { west } from './west';
import type { SkinDef } from './types';

/**
 * Registro de skins. Para añadir una: crear `skins/<id>.tsx` exportando un SkinDef
 * y agregarlo aquí. El primero es el valor por defecto.
 */
export const SKINS = [classic, west, futuristic, creatures] as const satisfies readonly SkinDef[];

export type SkinId = (typeof SKINS)[number]['id'];
export const DEFAULT_SKIN: SkinId = 'classic';

const BY_ID = new Map<string, SkinDef>(SKINS.map((s) => [s.id, s]));

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && BY_ID.has(value);
}

export function getSkin(id: string): SkinDef {
  return BY_ID.get(id) ?? classic;
}

export const frontSymbolId = (id: string) => `pp-skin-${id}-front`;
export const backSymbolId = (id: string) => `pp-skin-${id}-back`;

const STYLE_CACHE = new Map<string, CSSProperties>();

/** Variables CSS de la skin para aplicar en cada carta (memoizado por id). */
export function skinStyle(id: string): CSSProperties {
  const cached = STYLE_CACHE.get(id);
  if (cached) return cached;
  const t = getSkin(id).tokens;
  const style = {
    '--card-bg': t.cardBg,
    '--card-fg': t.cardFg,
    '--card-index': t.cardIndex,
    '--card-border': t.cardBorder,
    '--card-selected-fg': t.selectedFg,
    '--card-font': t.fontFamily,
    '--card-weight': String(t.fontWeight),
    '--g-majority': t.groupMajority,
    '--g-lower': t.groupLower,
    '--g-higher': t.groupHigher,
  } as CSSProperties;
  STYLE_CACHE.set(id, style);
  return style;
}

export type { SkinDef, SkinTokens } from './types';
