/** Iniciales (máx. 2) para avatares sin foto. */
export function initials(name: string): string {
  // Solo letras/números: "Sofía (QA)" → ["Sofía", "QA"].
  const parts = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const chars = parts.length === 1 ? [...parts[0]].slice(0, 2) : [[...parts[0]][0], [...parts[parts.length - 1]][0]];
  return chars.join('').toUpperCase();
}
