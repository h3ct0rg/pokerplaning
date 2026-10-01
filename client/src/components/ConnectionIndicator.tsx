import type { ConnectionStatus } from '../hooks/useConnectionStatus';

const LABELS: Record<ConnectionStatus, string> = {
  connected: 'Conectado',
  reconnecting: 'Reconectando…',
  disconnected: 'Desconectado',
};

export function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  return (
    <span className={`conn conn-${status}`} role="status" aria-live="polite">
      <span className="conn-dot" aria-hidden="true" />
      <span className="conn-text">{LABELS[status]}</span>
    </span>
  );
}
