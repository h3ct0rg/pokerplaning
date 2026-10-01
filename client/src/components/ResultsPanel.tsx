import { useEffect, useId, useState } from 'react';
import type { DeckId } from '@shared/protocol';
import { formatNumber, formatPct, type RoundResults } from '../lib/results';

interface BannerProps {
  results: RoundResults;
}

/** Banner superior "Consenso"/"Mayoría" con valor sugerido. */
export function ResultsBanner({ results: r }: BannerProps) {
  if (!r.suggested) {
    return (
      <section className="banner banner-neutral" role="status">
        <div>
          <h2 className="h-md">Votos revelados</h2>
          <p className="muted">Nadie votó en esta ronda.</p>
        </div>
      </section>
    );
  }
  const title =
    r.agreement === 'consensus'
      ? `Consenso: ${r.suggested}`
      : r.agreement === 'majority'
        ? `Mayoría: ${r.suggested}`
        : `Más votado: ${r.suggested}`;
  return (
    <section className={`banner ${r.agreement === 'consensus' ? 'banner-ok' : 'banner-warn'}`} role="status">
      <span className="banner-icon" aria-hidden="true">
        {r.agreement === 'consensus' ? '✓' : '≈'}
      </span>
      <div>
        <h2 className="h-md">
          {title}
          {r.mode && (
            <span className="chip chip-success chip-mono">
              {formatPct(r.mode.pct)}{' '}
              {r.agreement === 'consensus' ? 'consenso' : r.agreement === 'majority' ? 'mayoría' : 'más votado'}
            </span>
          )}
        </h2>
        <p className="muted">
          {r.mode ? `${r.mode.count} de ${r.total} participantes votaron ${r.mode.value}.` : `${r.total} votos emitidos.`}
          {r.discrepancy && ` Extremos: ${r.discrepancy.low.value} y ${r.discrepancy.high.value}.`}
        </p>
      </div>
    </section>
  );
}

interface PanelProps {
  results: RoundResults;
  deck: readonly string[];
  deckId: DeckId;
  isOwner: boolean;
  hasCurrentStory: boolean;
  onRevote: () => void;
  onConfirm: (estimate: string) => void;
}

export function ResultsPanel({ results: r, deck, deckId, isOwner, hasCurrentStory, onRevote, onConfirm }: PanelProps) {
  const numericDeck = deckId !== 'tshirt';
  const maxCount = Math.max(1, ...r.distribution.map((d) => d.count));

  return (
    <div className="results">
      <section className="panel metrics-panel" aria-labelledby="metrics-title">
        <div className="panel-head">
          <h2 id="metrics-title" className="h-md">
            Métricas de votación
          </h2>
          <span className="chip chip-mono">N = {r.total} votos</span>
        </div>

        {r.total === 0 ? (
          <p className="muted">Nadie votó en esta ronda.</p>
        ) : (
          <>
            <div className="metrics">
              {numericDeck && (
                <>
                  <Metric label="Promedio" value={r.average !== null ? formatNumber(r.average) : '—'} sub={r.numericCount ? `Suma: ${formatNumber(r.sum)}` : 'Sin votos numéricos'} testId="metric-average" />
                  <Metric label="Mediana" value={r.median !== null ? formatNumber(r.median) : '—'} sub="Punto central" testId="metric-median" />
                </>
              )}
              <Metric
                label={r.agreement === 'plurality' ? 'Moda' : 'Moda (mayoría)'}
                tone="success"
                value={r.mode?.value ?? '—'}
                sub={r.mode ? `${r.mode.count} de ${r.total} votos (${formatPct(r.mode.pct)})` : 'Sin estimaciones'}
                testId="metric-mode"
              />
              <Metric
                label="Rango (mín / máx)"
                value={r.range ? (r.range.min === r.range.max ? r.range.min : `${r.range.min} → ${r.range.max}`) : '—'}
                sub="Por orden de la baraja"
                testId="metric-range"
              />
            </div>

            <h3 className="eyebrow">Distribución</h3>
            <ul className="distribution">
              {r.distribution.map((d) => {
                const isMode = r.mode?.value === d.value;
                const voter = r.votes.find((v) => v.value === d.value);
                const group = voter ? r.groups[voter.id] : 'other';
                return (
                  <li key={d.value} className={`dist-${group}${isMode ? ' is-mode' : ''}`}>
                    <div className="dist-row">
                      <span className="dist-value">
                        {d.value}
                        {isMode && <span className="chip chip-success chip-xs">Moda</span>}
                      </span>
                      <span className="dist-count mono">
                        {d.count} {d.count === 1 ? 'voto' : 'votos'} ({formatPct(d.pct)})
                      </span>
                    </div>
                    <span className="dist-bar" aria-hidden="true">
                      <span style={{ width: `${(d.count / maxCount) * 100}%` }} />
                    </span>
                    <span className="dist-voters muted small">
                      {d.voters.length === 1 ? 'Votante' : 'Votantes'}: {d.voters.join(', ')}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {r.discrepancy && (
        <section className="panel discrepancy" aria-labelledby="disc-title">
          <h2 id="disc-title" className="eyebrow">
            Discrepancia
          </h2>
          <p>
            Diferencia entre <strong>{r.discrepancy.low.name}</strong> ({r.discrepancy.low.value}) y{' '}
            <strong>{r.discrepancy.high.name}</strong> ({r.discrepancy.high.value}).
          </p>
        </section>
      )}

      {!isOwner && (
        <p className="muted small center results-wait">Esperando a que el host confirme la estimación o reinicie la ronda.</p>
      )}
      {isOwner && (
        <FinalEstimate
          key={r.suggested ?? ''}
          suggested={r.suggested}
          deck={deck}
          hasCurrentStory={hasCurrentStory}
          onRevote={onRevote}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
}

function Metric({ label, value, sub, tone, testId }: { label: string; value: string; sub: string; tone?: 'success'; testId?: string }) {
  return (
    <div className={`metric${tone ? ` metric-${tone}` : ''}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value" data-testid={testId}>
        {value}
      </span>
      <span className="metric-sub">{sub}</span>
    </div>
  );
}

function FinalEstimate({
  suggested,
  deck,
  hasCurrentStory,
  onRevote,
  onConfirm,
}: {
  suggested: string | null;
  deck: readonly string[];
  hasCurrentStory: boolean;
  onRevote: () => void;
  onConfirm: (estimate: string) => void;
}) {
  const selectId = useId();
  const hintId = useId();
  const [estimate, setEstimate] = useState(suggested ?? deck[0]);
  useEffect(() => {
    if (!deck.includes(estimate)) setEstimate(suggested ?? deck[0]);
  }, [deck, estimate, suggested]);

  return (
    <section className="panel final-bar" aria-label="Estimación final">
      <div className="final-select">
        <label htmlFor={selectId} className="eyebrow">
          Puntaje final estimado
        </label>
        <select id={selectId} value={estimate} onChange={(e) => setEstimate(e.target.value)}>
          {deck.map((v) => (
            <option key={v} value={v}>
              {v}
              {v === suggested ? ' (sugerido)' : ''}
            </option>
          ))}
        </select>
        {suggested && <span className="small success">Sugerido por moda: {suggested}</span>}
      </div>
      <div className="final-actions">
        <button type="button" className="btn btn-secondary btn-lg" onClick={onRevote}>
          ↻ Votar de nuevo
        </button>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={!hasCurrentStory}
          aria-describedby={!hasCurrentStory ? hintId : undefined}
          onClick={() => onConfirm(estimate)}
        >
          ✓ Confirmar {estimate} &amp; siguiente
        </button>
      </div>
      {!hasCurrentStory && (
        <p id={hintId} className="muted small full">
          Agrega o selecciona una historia en la cola para poder confirmar la estimación.
        </p>
      )}
    </section>
  );
}
