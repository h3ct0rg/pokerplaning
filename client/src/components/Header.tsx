import { Link } from 'react-router-dom';
import type { RoomState } from '@shared/protocol';
import type { ConnectionStatus } from '../hooks/useConnectionStatus';
import { formatDuration } from '../lib/time';
import { initials } from '../lib/initials';
import { ConnectionIndicator } from './ConnectionIndicator';
import { Logo } from './Logo';
import { SkinPicker } from './SkinPicker';

interface Props {
  room: RoomState;
  elapsedMs: number;
  status: ConnectionStatus;
  onShare: () => void;
  onToggleSpectator: () => void;
  onEditName: () => void;
}

export function Header({ room, elapsedMs, status, onShare, onToggleSpectator, onEditName }: Props) {
  const me = room.participants.find((p) => p.id === room.selfId);
  const owner = room.participants.find((p) => p.id === room.ownerId);
  const isOwner = room.ownerId === room.selfId;
  const spectator = me?.role === 'spectator';

  return (
    <header className="app-header">
      <div className="header-row">
        <Link to="/" className="brand tap-target" aria-label="Poker Planning, ir al inicio">
          <Logo size={30} />
        </Link>
        <span className="chip chip-live mono hide-xs" aria-label="Sala en vivo">
          <span className="live-dot" aria-hidden="true" /> LIVE
        </span>

        <div className="header-spacer" />

        <div className="room-code">
          <span className="mono muted small hide-sm">SALA:</span>
          <span className="mono room-code-value">{room.id}</span>
          <button type="button" className="btn btn-icon" onClick={onShare} aria-label="Compartir sala" title="Compartir sala">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1Z"
              />
            </svg>
          </button>
        </div>

        <span className={`timer mono${room.revealed ? ' is-frozen' : ''}`} title={room.revealed ? 'Duración de la ronda' : 'Tiempo de la ronda'}>
          <span aria-hidden="true">⏱</span>
          <span className="sr-only">{room.revealed ? 'Ronda completada en' : 'Tiempo de ronda'}</span>
          <time data-testid="round-timer">{formatDuration(elapsedMs)}</time>
        </span>

        <button type="button" className="me-button" onClick={onEditName} aria-label={`Tu nombre: ${me?.name ?? ''}. Cambiar nombre`}>
          {isOwner && <span className="chip chip-owner chip-xs hide-sm">👑 Owner</span>}
          <span className="me-name hide-md">{me?.name}</span>
          <span className="avatar avatar-sm" aria-hidden="true">
            {initials(me?.name ?? '?')}
          </span>
        </button>
      </div>

      <div className="header-row header-sub">
        <ConnectionIndicator status={status} />
        {owner && (
          <span className="chip chip-owner">
            <span className="hide-sm">Host:</span> {owner.name} 👑
          </span>
        )}
        <div className="header-spacer" />
        <SkinPicker />
        <button
          type="button"
          className={`btn btn-ghost btn-sm${spectator ? ' is-active' : ''}`}
          aria-pressed={spectator}
          onClick={onToggleSpectator}
        >
          👁 Vista espectador
        </button>
      </div>
    </header>
  );
}
