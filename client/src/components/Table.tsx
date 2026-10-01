import type { CSSProperties } from 'react';
import type { RoomState } from '@shared/protocol';
import type { RoundResults } from '../lib/results';
import { formatPct } from '../lib/results';
import { Seat } from './Seat';
import { voteProgress } from './VoteProgress';

const RING_MAX = 12;

interface Props {
  room: RoomState;
  results: RoundResults | null;
  isOwner: boolean;
  onReveal: () => void;
  onReset: () => void;
  onMakeOwner: (participantId: string, name: string) => void;
}

/** Mesa: asientos alrededor de un hub (desktop) o lista de 2 columnas (mobile). */
export function Table({ room, results, isOwner, onReveal, onReset, onMakeOwner }: Props) {
  const { voted, total } = voteProgress(room.participants);
  const ring = room.participants.length <= RING_MAX;
  const n = room.participants.length;
  const positions = seatPositions(n);
  const majorityLabel = majorityLabelFor(results);

  return (
    <section className="panel table-panel" aria-labelledby="table-title">
      <div className="panel-head">
        <h2 id="table-title" className="eyebrow">
          <span className="live-dot" aria-hidden="true" /> Mesa en tiempo real
        </h2>
        <span className="mono muted">
          {voted}/{total} votaron
        </span>
      </div>

      <div className={`felt${ring ? ' is-ring' : ''}${ring && n > 8 ? ' is-crowded' : ''}`}>
        <div className="hub" aria-live="polite">
          {room.revealed && results ? <HubResult results={results} /> : <HubVoting voted={voted} total={total} />}
        </div>
        <ul className="seats" aria-label="Participantes en la mesa">
          {room.participants.map((p, i) => {
            const pos = positions[i];
            const style = ring
              ? ({ '--x': pos.x.toFixed(3), '--y': pos.y.toFixed(3) } as CSSProperties)
              : undefined;
            return (
              <Seat
                key={p.id}
                participant={p}
                isSelf={p.id === room.selfId}
                isOwner={p.id === room.ownerId}
                revealed={room.revealed}
                group={results?.groups[p.id]}
                majorityLabel={majorityLabel}
                onMakeOwner={isOwner && p.id !== room.selfId && p.connected ? () => onMakeOwner(p.id, p.name) : undefined}
                style={style}
              />
            );
          })}
        </ul>
      </div>

      {room.revealed && results && (
        <ul className="legend" aria-label="Leyenda de colores">
          <li>
            <span className="dot dot-majority" /> {majorityLabel}{results.mode ? ` (${results.mode.value})` : ''}
          </li>
          <li>
            <span className="dot dot-lower" /> Menor
          </li>
          <li>
            <span className="dot dot-higher" /> Mayor
          </li>
        </ul>
      )}

      {isOwner && !room.revealed && (
        <div className="table-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onReveal}
            disabled={voted === 0}
            aria-describedby={voted === 0 ? 'reveal-hint' : undefined}
          >
            👁 Revelar votos
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={onReset}>
            ↻ Reiniciar
          </button>
          {voted === 0 && (
            <p id="reveal-hint" className="muted small full">
              Se necesita al menos un voto para revelar.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Posiciones normalizadas (-1..1) alrededor del hub: fila superior, fila inferior
 * y, desde 7 participantes, un asiento a cada lado del hub. Evita solapes que
 * produce el reparto por ángulos iguales cuando la mesa es baja.
 */
export function seatPositions(n: number): { x: number; y: number }[] {
  if (n <= 0) return [];
  const sides = n >= 7 ? 2 : 0;
  const rest = n - sides;
  const top = Math.ceil(rest / 2);
  const bottom = rest - top;
  const row = (k: number, y: number) =>
    Array.from({ length: k }, (_, i) => ({ x: k === 1 ? 0 : -0.8 + (1.6 * i) / (k - 1), y }));
  const topRow = row(top, -1);
  const bottomRow = row(bottom, 1).reverse();
  // Orden en sentido horario: arriba (izq→der), derecha, abajo (der→izq), izquierda.
  return sides
    ? [...topRow, { x: 1, y: 0 }, ...bottomRow, { x: -1, y: 0 }]
    : [...topRow, ...bottomRow];
}

/** "Mayoría" solo si el grupo más votado supera el 50 % (o hay consenso). */
export function majorityLabelFor(results: RoundResults | null): string {
  return results?.agreement === 'plurality' ? 'Más votado' : 'Mayoría';
}

function HubVoting({ voted, total }: { voted: number; total: number }) {
  return (
    <>
      <span className="hub-ring" aria-hidden="true" />
      <span className="hub-label">Votación en progreso</span>
      <span className="hub-value mono">
        {voted}/{total}
      </span>
    </>
  );
}

function HubResult({ results }: { results: RoundResults }) {
  if (!results.suggested) {
    return (
      <>
        <span className="hub-label">Sin votos</span>
        <span className="hub-value">—</span>
      </>
    );
  }
  const label =
    results.agreement === 'consensus' ? 'Consenso' : results.agreement === 'majority' ? 'Mayoría' : 'Más votado';
  return (
    <>
      <span className="hub-label is-done">{label}</span>
      <span className="hub-value">{results.suggested}</span>
      {results.mode && <span className="hub-sub mono">{formatPct(results.mode.pct)}</span>}
    </>
  );
}
