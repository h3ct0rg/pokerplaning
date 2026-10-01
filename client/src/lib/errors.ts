import type { ErrorCode } from '@shared/protocol';

const MESSAGES: Record<ErrorCode, string> = {
  ROOM_NOT_FOUND: 'La sala no existe.',
  INVALID_INPUT: 'Datos no válidos.',
  NOT_OWNER: 'Solo el host puede hacer esto.',
  NOT_IN_ROOM: 'No estás en la sala. Reintentando…',
  RATE_LIMITED: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
};

export function errorMessage(code: ErrorCode | 'TIMEOUT'): string {
  if (code === 'TIMEOUT') return 'Sin respuesta del servidor. Inténtalo de nuevo.';
  return MESSAGES[code] ?? 'Ocurrió un error.';
}
