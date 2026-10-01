import { useEffect, useState } from 'react';
import type { AppSocket } from '../lib/socket';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

function statusOf(socket: AppSocket): ConnectionStatus {
  if (socket.connected) return 'connected';
  return socket.active ? 'reconnecting' : 'disconnected';
}

export function useConnectionStatus(socket: AppSocket): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(() => statusOf(socket));

  useEffect(() => {
    const update = () => setStatus(statusOf(socket));
    socket.on('connect', update);
    socket.on('disconnect', update);
    socket.on('connect_error', update);
    socket.io.on('reconnect_attempt', update);
    socket.io.on('reconnect_failed', update);
    update();
    return () => {
      socket.off('connect', update);
      socket.off('disconnect', update);
      socket.off('connect_error', update);
      socket.io.off('reconnect_attempt', update);
      socket.io.off('reconnect_failed', update);
    };
  }, [socket]);

  return status;
}
