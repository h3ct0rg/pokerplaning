import type { CSSProperties } from 'react';
import type { Participant } from '@shared/protocol';
import type { VoteGroup } from '../lib/results';
import { initials } from '../lib/initials';
import { Card, EmptyCard, FaceDownCard } from './Card';

const GROUP_LABEL: Record<VoteGroup, string> = {
  majority: 'Mayoría',
  lower: 'Menor',
  higher: 'Mayor',
  other: 'Sin estimar',
};

interface Props {
  participant: Participant;
  isSelf: boolean;
  isOwner: boolean;
  revealed: boolean;
  group?: VoteGroup;
  /** Etiqueta del grupo más votado: "Mayoría" (>50 %) o "Más votado". */
  majorityLabel?: string;
  /** Si se pasa, muestra el botón para ceder el host (solo lo ve el owner). */
  onMakeOwner?: () => void;
  style?: CSSProperties;
}

export function Seat({ participant: p, isSelf, isOwner, revealed, group, majorityLabel = 'Mayoría', onMakeOwner, style }: Props) {
  const spectator = p.role === 'spectator';

  let card;
  let status: { cls: string; text: string };
  if (spectator) {
    card = <EmptyCard label="👁" />;
    status = { cls: 'st-spectator', text: 'Espectador' };
  } else if (revealed && p.vote) {
    card = <Card value={p.vote} size="table" group={group} />;
    status = group ? { cls: `st-${group}`, text: group === 'majority' ? majorityLabel : GROUP_LABEL[group] } : { cls: 'st-voted', text: 'Votó' };
  } else if (p.hasVoted) {
    card = <FaceDownCard />;
    status = { cls: 'st-voted', text: '✓ Votó' };
  } else if (revealed) {
    card = <EmptyCard label="—" />;
    status = { cls: 'st-pending', text: 'Sin voto' };
  } else {
    card = <EmptyCard label="…" />;
    status = { cls: 'st-pending', text: 'Pensando…' };
  }
  if (!p.connected) status = { cls: 'st-offline', text: 'Conectando…' };

  return (
    <li
      className={`seat${spectator ? ' is-spectator' : ''}${!p.connected ? ' is-offline' : ''}${isSelf ? ' is-self' : ''}`}
      style={style}
    >
      <div className="seat-card">
        {card}
        {!spectator && p.hasVoted && !revealed && (
          <span className="seat-pip" aria-hidden="true">
            ✓
          </span>
        )}
      </div>
      <div className="seat-info">
        <span className="avatar" aria-hidden="true">
          {initials(p.name)}
        </span>
        <span className="seat-name">
          <span className={`conn-dot-sm ${p.connected ? 'on' : 'off'}`} aria-hidden="true" />
          <span className="seat-name-text" title={p.name}>
            {p.name}
            {isSelf && <span className="muted"> (Tú)</span>}
          </span>
          {isOwner && (
            <span className="seat-crown" role="img" aria-label="Host">
              👑
            </span>
          )}
        </span>
        <span className={`seat-status ${status.cls}`}>{status.text}</span>
        {onMakeOwner && (
          <button
            type="button"
            className="btn btn-icon seat-make-owner"
            onClick={onMakeOwner}
            aria-label={`Ceder host a ${p.name}`}
            title={`Ceder host a ${p.name}`}
          >
            👑
          </button>
        )}
      </div>
    </li>
  );
}
