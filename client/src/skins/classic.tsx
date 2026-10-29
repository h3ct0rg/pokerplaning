import type { SkinDef } from './types';

/** Clásico: el aspecto Agile Slate original (por defecto). */
export const classic: SkinDef = {
  id: 'classic',
  nombre: 'Clásico',
  descripcion: 'Pizarra oscura y acentos índigo: el mazo original.',
  tokens: {
    cardBg: '#1e293b',
    cardFg: '#f8fafc',
    cardIndex: '#9ea3c0',
    cardBorder: '#334155',
    selectedFg: '#c0c1ff',
    groupMajority: '#4edea3',
    groupLower: '#d0bcff',
    groupHigher: '#ffb4ab',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontWeight: 800,
  },
  front: () => <rect x="3" y="3" width="94" height="144" rx="9" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="2" />,
  back: () => (
    <>
      <defs>
        <pattern id="pp-classic-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0V12M0 0H12" stroke="#334155" strokeWidth="1.6" />
        </pattern>
      </defs>
      <rect width="100" height="150" fill="#1e293b" />
      <rect width="100" height="150" fill="url(#pp-classic-hatch)" />
      <path d="M50 52 L70 75 L50 98 L30 75 Z" fill="#1e293b" stroke="#6366f1" strokeOpacity="0.55" strokeWidth="2" />
      <rect x="6" y="6" width="88" height="138" rx="8" fill="none" stroke="#475569" strokeWidth="1.5" />
    </>
  ),
};
