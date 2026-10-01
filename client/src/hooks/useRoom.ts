import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorCode, RoomState } from '@shared/protocol';
import { getClientId } from '../lib/identity';
import type { AppSocket } from '../lib/socket';

const JOIN_TIMEOUT_MS = 8000;

export type JoinError = ErrorCode | 'TIMEOUT' | null;

export interface UseRoomResult {
  room: RoomState | null;
  joinError: JoinError;
  joined: boolean;
  /** serverNow - Date.now() medido en el último room:state. */
  clockOffset: number;
  rejoin: () => void;
}

/**
 * Se une a la sala cuando hay nombre y vuelve a emitir room:join
 * en cada (re)conexión del socket. Escucha room:state de esa sala.
 * `roomCode` se compara sin distinguir mayúsculas (el servidor normaliza).
 */
export function useRoom(socket: AppSocket, roomCode: string, name: string | null): UseRoomResult {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [joinError, setJoinError] = useState<JoinError>(null);
  const [joined, setJoined] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const nameRef = useRef(name);
  nameRef.current = name;
  const code = roomCode.trim().toUpperCase();

  const join = useCallback(() => {
    const currentName = nameRef.current;
    if (!currentName || !socket.connected) return;
    socket
      .timeout(JOIN_TIMEOUT_MS)
      .emit('room:join', { roomId: code, name: currentName, clientId: getClientId() }, (err, res) => {
        if (err) {
          setJoinError('TIMEOUT');
          return;
        }
        if (res.ok) {
          setJoinError(null);
          setJoined(true);
        } else {
          setJoined(false);
          setJoinError(res.error);
        }
      });
  }, [socket, code]);

  useEffect(() => {
    const onState = (s: RoomState) => {
      if (s.id.toUpperCase() !== code) return;
      setClockOffset(s.serverNow - Date.now());
      setRoom(s);
    };
    const onDisconnect = () => setJoined(false);
    socket.on('room:state', onState);
    socket.on('connect', join);
    socket.on('disconnect', onDisconnect);
    if (!socket.connected && !socket.active) socket.connect();
    return () => {
      socket.off('room:state', onState);
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, code, join]);

  const hasName = name !== null && name !== '';
  useEffect(() => {
    if (hasName) join();
  }, [hasName, join]);

  return { room, joinError, joined, clockOffset, rejoin: join };
}
