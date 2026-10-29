import { starPath, starTips } from './shapes';
import type { SkinDef } from './types';

const INK = '#3b2412';
const GOLD = '#c9a227';
const sheriff = starPath(50, 66, 22, 11, 6);
const tips = starTips(50, 66, 22, 6);
const cornerStarTR = starPath(85, 17, 5, 2.2, 5);
const cornerStarBL = starPath(15, 133, 5, 2.2, 5);

/** Viejo Oeste: papel de cartel, cuerda, estrella de sheriff y herradura. */
export const west: SkinDef = {
  id: 'west',
  nombre: 'Viejo Oeste',
  descripcion: 'Cartel de pergamino, estrella de sheriff y herradura de la suerte.',
  tokens: {
    cardBg: '#f1e0bd',
    cardFg: INK,
    cardIndex: '#6b4423',
    cardBorder: '#8a5a2b',
    selectedFg: '#2f2ebe',
    groupMajority: '#0d5c3a',
    groupLower: '#4c2a9e',
    groupHigher: '#9a1c12',
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
  },
  front: () => (
    <>
      <rect x="4" y="4" width="92" height="142" rx="7" fill="none" stroke="#8a5a2b" strokeWidth="2.5" />
      <rect x="9" y="9" width="82" height="132" rx="4" fill="none" stroke="#8a5a2b" strokeWidth="1.2" strokeDasharray="4 3" />
      <path d={cornerStarTR} fill={GOLD} stroke="#7a5a10" strokeWidth="0.6" />
      <path d={cornerStarBL} fill={GOLD} stroke="#7a5a10" strokeWidth="0.6" />
      {/* herradura pequeña y tenue, lejos del centro */}
      <path d="M44 132 v-6 a6 6 0 0 1 12 0 v6" fill="none" stroke="#8a5a2b" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M44 18 l6 -5 l6 5" fill="none" stroke="#8a5a2b" strokeOpacity="0.45" strokeWidth="1.4" />
    </>
  ),
  back: () => (
    <>
      <rect width="100" height="150" fill="#5a3418" />
      {[18, 36, 54, 72, 90, 108, 126, 144].map((y) => (
        <path key={y} d={`M0 ${y}H100`} stroke="#432611" strokeWidth="1.4" />
      ))}
      {/* cartel "se busca" sin texto */}
      <path d="M16 22 H84 L82 30 L85 40 L83 128 H17 L15 118 L18 106 Z" fill="#ecd9b0" stroke={INK} strokeWidth="1.5" />
      <rect x="24" y="30" width="52" height="5" rx="1" fill="#8a5a2b" opacity="0.55" />
      {[
        [21, 27],
        [79, 27],
        [21, 123],
        [79, 123],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="#6b6b6b" />
      ))}
      {/* estrella de sheriff */}
      <path d={sheriff} fill={GOLD} stroke="#7a5a10" strokeWidth="1.4" strokeLinejoin="round" />
      {tips.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill={GOLD} stroke="#7a5a10" strokeWidth="1" />
      ))}
      <circle cx="50" cy="66" r="8" fill="none" stroke="#7a5a10" strokeWidth="1.4" />
      {/* herradura */}
      <path d="M38 118 v-9 a12 12 0 0 1 24 0 v9" fill="none" stroke="#6f6f6f" strokeWidth="5" strokeLinecap="round" />
      {[
        [38, 112],
        [41, 104],
        [62, 112],
        [59, 104],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#3b3b3b" />
      ))}
    </>
  ),
};
