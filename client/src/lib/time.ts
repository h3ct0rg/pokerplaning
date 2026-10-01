/** mm:ss (o h:mm:ss a partir de una hora). Negativos se tratan como 0. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Tiempo transcurrido de la ronda. `clockOffset` = serverNow - Date.now() al recibir el estado.
 * Congelado en revealedAt si la ronda está revelada.
 */
export function roundElapsed(
  roundStartedAt: number,
  revealedAt: number | null,
  clockOffset: number,
  localNow: number = Date.now(),
): number {
  const end = revealedAt ?? localNow + clockOffset;
  return Math.max(0, end - roundStartedAt);
}
