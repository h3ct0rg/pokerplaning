import type { VoteGroup } from '../lib/results';

export type CardSize = 'hand' | 'table' | 'mini';

interface BaseProps {
  value?: string;
  size?: CardSize;
  group?: VoteGroup;
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

/** Carta boca arriba. Con `onSelect` es un botón real con aria-pressed. */
export function Card({ value, size = 'hand', selected = false, disabled, group, onSelect }: FaceProps) {
  const cls = ['pcard', `pcard-${size}`, selected && 'is-selected', group && `group-${group}`]
    .filter(Boolean)
    .join(' ');
  const face = (
    <>
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
  if (onSelect) {
    return (
      <button
        type="button"
        className={cls}
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
    <span className={`${cls} is-revealed`} role="img" aria-label={`Carta ${cardLabel(value)}`}>
      {face}
    </span>
  );
}

/** Carta boca abajo (voto emitido, oculto). */
export function FaceDownCard({ size = 'table' }: { size?: CardSize }) {
  return (
    <span className={`pcard pcard-${size} is-facedown`} role="img" aria-label="Voto oculto">
      <svg className="pcard-lock" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Zm3 4a2 2 0 0 1 1 3.73V19h-2v-1.27A2 2 0 0 1 12 14Z"
        />
      </svg>
      <span className="pcard-locked">LOCKED</span>
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
