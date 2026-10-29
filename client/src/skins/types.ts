import type { ReactElement } from 'react';

/** Tokens visuales de una skin. Colores en hex #rrggbb (se validan por contraste en tests). */
export interface SkinTokens {
  /** Fondo de la cara frontal. */
  cardBg: string;
  /** Texto del valor (contraste ≥ 4.5:1 sobre cardBg). */
  cardFg: string;
  /** Índices de esquina. */
  cardIndex: string;
  /** Borde por defecto. */
  cardBorder: string;
  /** Valor cuando la carta está seleccionada. */
  selectedFg: string;
  /** Colores de grupo de resultados sobre cardBg (texto y borde). */
  groupMajority: string;
  groupLower: string;
  groupHigher: string;
  /** Pila tipográfica del valor (solo fuentes ya cargadas o del sistema). */
  fontFamily: string;
  /** Peso del valor. */
  fontWeight: number;
}

export interface SkinDef {
  id: string;
  nombre: string;
  descripcion: string;
  tokens: SkinTokens;
  /** Contenido SVG (viewBox 0 0 100 150) del marco frontal; el centro queda libre para el valor. */
  front: () => ReactElement;
  /** Contenido SVG (viewBox 0 0 100 150) del dorso. */
  back: () => ReactElement;
}

/** Caja común de todo el arte de cartas (proporción 2:3). */
export const ART_VIEWBOX = '0 0 100 150';
