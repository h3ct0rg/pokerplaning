import type { SkinDef } from './types';

const CYAN = '#22d3ee';
const MAGENTA = '#e879f9';

/** Futurista: panel oscuro con circuitos neón y un robot en el dorso. */
export const futuristic: SkinDef = {
  id: 'futuristic',
  nombre: 'Futurista',
  descripcion: 'Circuitos de neón y un robot amistoso en el dorso.',
  tokens: {
    cardBg: '#0b1020',
    cardFg: '#a5f3fc',
    cardIndex: '#67e8f9',
    cardBorder: '#155e75',
    selectedFg: '#f0abfc',
    groupMajority: '#4edea3',
    groupLower: '#d0bcff',
    groupHigher: '#ffb4ab',
    fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace",
    fontWeight: 700,
  },
  front: () => (
    <>
      {/* esquinas tipo visor */}
      <path d="M6 22V6H22M78 6H94V22M94 128V144H78M22 144H6V128" fill="none" stroke={CYAN} strokeWidth="2.4" strokeLinecap="round" />
      {/* pistas de circuito por los bordes */}
      <path d="M10 40V60l5 5v20M90 110V90l-5-5V65" fill="none" stroke={CYAN} strokeOpacity="0.55" strokeWidth="1.3" />
      <circle cx="15" cy="85" r="2" fill={CYAN} />
      <circle cx="85" cy="65" r="2" fill={CYAN} />
      <path d="M34 140h32M34 10h32" stroke={MAGENTA} strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  back: () => (
    <>
      <defs>
        <linearGradient id="pp-fut-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1020" />
          <stop offset="1" stopColor="#141c44" />
        </linearGradient>
        <pattern id="pp-fut-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0H0V10" fill="none" stroke={CYAN} strokeOpacity="0.12" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100" height="150" fill="url(#pp-fut-bg)" />
      <rect width="100" height="150" fill="url(#pp-fut-grid)" />
      {/* circuitos hacia el robot */}
      <path d="M0 30H18l8 8v14M100 30H82l-8 8v14M0 122H20l8-8M100 122H80l-8-8" fill="none" stroke={MAGENTA} strokeWidth="1.5" />
      {[
        [18, 30],
        [82, 30],
        [20, 122],
        [80, 122],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={MAGENTA} />
      ))}
      {/* antena */}
      <path d="M50 52V40" stroke={CYAN} strokeWidth="2" />
      <circle cx="50" cy="37" r="5" fill={MAGENTA} opacity="0.35" />
      <circle cx="50" cy="37" r="3" fill={MAGENTA} />
      {/* orejas */}
      <rect x="22" y="62" width="7" height="16" rx="2" fill="#1e293b" stroke={CYAN} strokeWidth="1.5" />
      <rect x="71" y="62" width="7" height="16" rx="2" fill="#1e293b" stroke={CYAN} strokeWidth="1.5" />
      {/* cabeza */}
      <rect x="28" y="52" width="44" height="38" rx="9" fill="#1e293b" stroke={CYAN} strokeWidth="2.2" />
      <circle cx="40" cy="68" r="8" fill={CYAN} opacity="0.25" />
      <circle cx="60" cy="68" r="8" fill={CYAN} opacity="0.25" />
      <circle cx="40" cy="68" r="4.6" fill={CYAN} />
      <circle cx="60" cy="68" r="4.6" fill={CYAN} />
      <circle cx="41.5" cy="66.5" r="1.4" fill="#ffffff" />
      <circle cx="61.5" cy="66.5" r="1.4" fill="#ffffff" />
      {/* boca rejilla */}
      <rect x="38" y="78" width="24" height="6" rx="2" fill="#0b1020" stroke={CYAN} strokeWidth="1.2" />
      <path d="M44 78v6M50 78v6M56 78v6" stroke={CYAN} strokeWidth="1" />
      {/* cuello y torso */}
      <rect x="44" y="90" width="12" height="5" fill="#334155" />
      <path d="M30 95H70L74 120H26Z" fill="#1e293b" stroke={CYAN} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="50" cy="106" r="5" fill={MAGENTA} opacity="0.3" />
      <circle cx="50" cy="106" r="3" fill={MAGENTA} />
      <rect x="6" y="6" width="88" height="138" rx="8" fill="none" stroke={CYAN} strokeOpacity="0.5" strokeWidth="1.5" />
    </>
  ),
};
