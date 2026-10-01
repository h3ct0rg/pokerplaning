import type { Participant } from '@shared/protocol';

/** Cuenta solo players conectados o que ya votaron (los espectadores no cuentan). */
export function voteProgress(participants: Participant[]) {
  const eligible = participants.filter((p) => p.role === 'player' && (p.connected || p.hasVoted));
  const voted = eligible.filter((p) => p.hasVoted).length;
  const total = eligible.length;
  return { voted, total, pct: total ? Math.round((voted / total) * 100) : 0 };
}

export function VoteProgress({ participants }: { participants: Participant[] }) {
  const { voted, total, pct } = voteProgress(participants);
  return (
    <section className="panel progress-panel" aria-labelledby="progress-title">
      <div className="progress-head">
        <h2 id="progress-title" className="h-md">
          Votación en progreso
        </h2>
        <span className="chip chip-mono">
          {voted} / {total} han votado
        </span>
        <span className="progress-pct mono">{pct}%</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${voted} de ${total} han votado`}
      >
        <span className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
