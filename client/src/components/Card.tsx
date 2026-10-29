import type { VoteGroup } from '../lib/results';
import { backSymbolId, frontSymbolId, skinStyle } from '../skins';
import { useSkin } from '../skins/store';

export type CardSize = 'hand' | 'table' | 'mini';

interface BaseProps {
  value?: string;
  size?: CardSize;
  group?: VoteGroup;
  /** Fuerza una skin (vista previa del selector). Por defecto, la elegida por el usuario. */
  skin?: string;
}

interface FaceProps extends BaseProps {
  value: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export function cardLabel(value: string): string {
  if (value === '☕') return 'Café (necesito una pausa)';
  if (value === '?') return 'No estoy seguro (?)';
  if (value === '½') return 'Medio punto';
  return value;
}

/** Arte SVG de la skin (referencia al sprite); siempre decorativo. */
function Art({ symbol, className }: { symbol: string; className: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={`#${symbol}`} />
    </svg>
  );
}

/** Carta boca arriba. Con `onSelect` es un botón real con aria-pressed. El valor siempre es texto. */
export function Card({ value, size = 'hand', selected = false, disabled, group, onSelect, skin }: FaceProps) {
  const userSkin = useSkin();
  const skinId = skin ?? userSkin;
  const cls = [
    'pcard',
    `pcard-${size}`,
    `skin-${skinId}`,
    selected && 'is-selected',
    group && `group-${group}`,
    [...value].length >= 3 && 'is-long',
  ]
    .filter(Boolean)
    .join(' ');
  const face = (
    <>
      <Art symbol={frontSymbolId(skinId)} className="pcard-art" />
      <span className="pcard-corner tl" aria-hidden="true">
        {value}
      </span>
      <span className="pcard-value" aria-hidden="true">
        {value}
      </span>
      <span className="pcard-corner br" aria-hidden="true">
        {value}
      </span>
    </>
  );
  const style = skinStyle(skinId);
  if (onSelect) {
    return (
      <button
        type="button"
        className={cls}
        style={style}
        aria-pressed={selected}
        aria-label={`Votar ${cardLabel(value)}`}
        disabled={disabled}
        onClick={onSelect}
      >
        {face}
      </button>
    );
  }
  return (
    <span className={`${cls} is-revealed`} style={style} role="img" aria-label={`Carta ${cardLabel(value)}`}>
      {face}
      {/* dorso visible durante la primera mitad del giro */}
      <span className="pcard-backface" aria-hidden="true">
        <Art symbol={backSymbolId(skinId)} className="pcard-art" />
      </span>
    </span>
  );
}

/** Carta boca abajo (voto emitido, oculto) con el dorso de la skin. */
export function FaceDownCard({ size = 'table', skin }: { size?: CardSize; skin?: string }) {
  const userSkin = useSkin();
  const skinId = skin ?? userSkin;
  return (
    <span className={`pcard pcard-${size} skin-${skinId} is-facedown`} style={skinStyle(skinId)} role="img" aria-label="Voto oculto">
      <Art symbol={backSymbolId(skinId)} className="pcard-art" />
      <span className="pcard-lockbadge" aria-hidden="true">
        <svg className="pcard-lock" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Zm3 4a2 2 0 0 1 1 3.73V19h-2v-1.27A2 2 0 0 1 12 14Z"
          />
        </svg>
        <span className="pcard-locked">Oculto</span>
      </span>
    </span>
  );
}

/** Hueco de carta (aún no votó / desconectado). */
export function EmptyCard({ label, size = 'table' }: { label: string; size?: CardSize }) {
  return (
    <span className={`pcard pcard-${size} is-empty`} aria-hidden="true">
      <span className="pcard-locked">{label}</span>
    </span>
  );
}
