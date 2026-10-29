import { hexPath, starPath } from './shapes';
import type { SkinDef } from './types';

const sparkles: [number, number, number][] = [
  [16, 20, 4],
  [84, 44, 3],
  [20, 128, 3.5],
  [82, 132, 4],
  [14, 70, 2.5],
];

/**
 * Criaturas: arte ORIGINAL de "monstruos coleccionables" (sin personajes, marcas
 * ni objetos de franquicias existentes). Brotecito: criatura-planta con hojas por orejas
 * y un emblema de "tipo" hexagonal con una hoja.
 */
export const creatures: SkinDef = {
  id: 'creatures',
  nombre: 'Criaturas',
  descripcion: 'Brotecito, una criatura original, con su emblema de tipo hoja.',
  tokens: {
    cardBg: '#fff6e0',
    cardFg: '#2a1b4a',
    cardIndex: '#5b3fa0',
    cardBorder: '#7c5cff',
    selectedFg: '#2f2ebe',
    groupMajority: '#0d5c3a',
    groupLower: '#4c2a9e',
    groupHigher: '#9a1c12',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontWeight: 800,
  },
  front: () => (
    <>
      <rect x="4" y="4" width="92" height="142" rx="12" fill="none" stroke="#7c5cff" strokeWidth="3" />
      <circle cx="84" cy="16" r="4" fill="#ff9f43" />
      <circle cx="77" cy="12" r="2.4" fill="#2ec4b6" />
      <circle cx="16" cy="134" r="4" fill="#2ec4b6" />
      <circle cx="23" cy="138" r="2.4" fill="#ff9f43" />
      {/* huella tenue */}
      <g fill="#7c5cff" opacity="0.35">
        <ellipse cx="50" cy="134" rx="5" ry="4" />
        <circle cx="43.5" cy="127.5" r="1.8" />
        <circle cx="50" cy="125.5" r="1.8" />
        <circle cx="56.5" cy="127.5" r="1.8" />
      </g>
    </>
  ),
  back: () => (
    <>
      <defs>
        <radialGradient id="pp-cre-bg" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#8b7dff" />
          <stop offset="1" stopColor="#3b2f9e" />
        </radialGradient>
      </defs>
      <rect width="100" height="150" fill="url(#pp-cre-bg)" />
      {sparkles.map(([x, y, r]) => (
        <path key={`${x}-${y}`} d={starPath(x, y, r, r * 0.35, 4)} fill="#ffffff" opacity="0.8" />
      ))}
      {/* cola */}
      <path d="M72 100 q14 -2 12 -14 q-2 -8 -9 -5" fill="none" stroke="#2bb37d" strokeWidth="4" strokeLinecap="round" />
      {/* orejas-hoja */}
      <path d="M34 62 Q22 40 30 30 Q42 44 40 60 Z" fill="#2bb37d" stroke="#1f7a55" strokeWidth="1.2" />
      <path d="M66 62 Q78 40 70 30 Q58 44 60 60 Z" fill="#2bb37d" stroke="#1f7a55" strokeWidth="1.2" />
      <path d="M31 33 Q36 46 38 58M69 33 Q64 46 62 58" stroke="#1f7a55" strokeWidth="1" fill="none" />
      {/* cuerpo */}
      <ellipse cx="50" cy="84" rx="27" ry="25" fill="#3ddc97" stroke="#1f7a55" strokeWidth="1.6" />
      <ellipse cx="50" cy="94" rx="15" ry="12" fill="#c9f7e3" />
      {/* patas */}
      <ellipse cx="38" cy="108" rx="7" ry="4" fill="#2bb37d" stroke="#1f7a55" strokeWidth="1.2" />
      <ellipse cx="62" cy="108" rx="7" ry="4" fill="#2bb37d" stroke="#1f7a55" strokeWidth="1.2" />
      {/* cara */}
      <ellipse cx="41" cy="78" rx="5.5" ry="6.5" fill="#ffffff" />
      <ellipse cx="59" cy="78" rx="5.5" ry="6.5" fill="#ffffff" />
      <circle cx="42" cy="79" r="3.2" fill="#2a1b4a" />
      <circle cx="58" cy="79" r="3.2" fill="#2a1b4a" />
      <circle cx="43" cy="77.5" r="1.1" fill="#ffffff" />
      <circle cx="59" cy="77.5" r="1.1" fill="#ffffff" />
      <circle cx="34" cy="87" r="3" fill="#ff8fab" opacity="0.8" />
      <circle cx="66" cy="87" r="3" fill="#ff8fab" opacity="0.8" />
      <path d="M45 88 q5 5 10 0" fill="none" stroke="#2a1b4a" strokeWidth="1.6" strokeLinecap="round" />
      {/* brote en la cabeza */}
      <path d="M50 60 v-7" stroke="#1f7a55" strokeWidth="1.6" />
      <path d="M50 54 q-7 -6 -10 0 q6 3 10 0 Z M50 54 q7 -6 10 0 q-6 3 -10 0 Z" fill="#7be0b0" stroke="#1f7a55" strokeWidth="0.8" />
      {/* emblema de tipo (original): hexágono dorado con hoja */}
      <path d={hexPath(78, 26, 11)} fill="#ffd166" stroke="#b07d00" strokeWidth="1.5" />
      <path d="M72 30 Q72 20 84 20 Q84 32 72 30 Z" fill="#2bb37d" stroke="#1f7a55" strokeWidth="0.8" />
      <path d="M73 29 L82 21" stroke="#1f7a55" strokeWidth="0.8" />
      <rect x="6" y="6" width="88" height="138" rx="11" fill="none" stroke="#ffd166" strokeOpacity="0.8" strokeWidth="1.6" />
    </>
  ),
};
