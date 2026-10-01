import { createContext, useContext } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/protocol';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let singleton: AppSocket | null = null;

/** Socket único que conecta al mismo origen (en dev Vite hace proxy de /socket.io). */
export function getSocket(): AppSocket {
  if (!singleton) {
    singleton = io({
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
  }
  return singleton;
}

export const SocketContext = createContext<AppSocket | null>(null);

export function useSocket(): AppSocket {
  const socket = useContext(SocketContext);
  if (!socket) throw new Error('SocketContext no inicializado');
  return socket;
}
