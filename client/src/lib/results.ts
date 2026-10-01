import type { Participant } from '@shared/protocol';

/** Cartas que no representan una estimación (no entran en rango, moda ni grupos). */
export const NON_ESTIMATES: readonly string[] = ['?', '☕'];

export type VoteGroup = 'majority' | 'lower' | 'higher' | 'other';
export type AgreementKind = 'consensus' | 'majority' | 'plurality';

export interface CastVote {
  id: string;
  name: string;
  value: string;
}

export interface DistributionEntry {
  value: string;
  count: number;
  /** Porcentaje 0..100 sobre el total de votos emitidos. */
  pct: number;
  voters: string[];
}

export interface VoteRef {
  name: string;
  value: string;
}

export interface RoundResults {
  votes: CastVote[];
  total: number;
  /** Promedio de votos numéricos (½ = 0.5); null si no hay. */
  average: number | null;
  median: number | null;
  sum: number;
  numericCount: number;
  /** Valor más votado entre estimaciones; empate → el mayor según el mazo. */
  mode: { value: string; count: number; pct: number } | null;
  /** Rango por orden del mazo entre estimaciones. */
  range: { min: string; max: string } | null;
  /** Ordenada por orden del mazo. */
  distribution: DistributionEntry[];
  groups: Record<string, VoteGroup>;
  agreement: AgreementKind | null;
  /** Votantes en los extremos cuando el rango no es un único valor. */
  discrepancy: { low: VoteRef; high: VoteRef } | null;
  /** Estimación sugerida por defecto (moda, o el voto más frecuente si solo hay ?/☕). */
  suggested: string | null;
}

/** Valor numérico de una carta: dígitos o ½. Resto → null. */
export function numericValue(value: string): number | null {
  if (value === '½') return 0.5;
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
  return null;
}

export function isEstimate(value: string): boolean {
  return !NON_ESTIMATES.includes(value);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : round1((s[mid - 1] + s[mid]) / 2);
}

function pickMode(values: string[], deckIndex: (v: string) => number) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of counts) {
    if (!best || count > best.count || (count === best.count && deckIndex(value) > deckIndex(best.value))) {
      best = { value, count };
    }
  }
  return best;
}

export function computeResults(participants: Participant[], deck: readonly string[]): RoundResults {
  const deckIndex = (v: string) => {
    const i = deck.indexOf(v);
    return i === -1 ? -1 : i;
  };

  const votes: CastVote[] = participants
    .filter((p) => p.role === 'player' && typeof p.vote === 'string' && p.vote.length > 0)
    .map((p) => ({ id: p.id, name: p.name, value: p.vote as string }));
  const total = votes.length;
  const pct = (n: number) => (total ? round1((n / total) * 100) : 0);

  const byValue = new Map<string, string[]>();
  for (const v of votes) byValue.set(v.value, [...(byValue.get(v.value) ?? []), v.name]);
  const distribution = [...byValue.entries()]
    .map(([value, voters]) => ({ value, count: voters.length, pct: pct(voters.length), voters }))
    .sort((a, b) => {
      const ia = deckIndex(a.value);
      const ib = deckIndex(b.value);
      return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    });

  const nums = votes.map((v) => numericValue(v.value)).filter((n): n is number => n !== null);
  const sum = round1(nums.reduce((s, n) => s + n, 0));
  const average = nums.length ? round1(sum / nums.length) : null;

  const estimates = votes.filter((v) => isEstimate(v.value));
  const modeRaw = pickMode(
    estimates.map((v) => v.value),
    deckIndex,
  );
  const mode = modeRaw ? { ...modeRaw, pct: pct(modeRaw.count) } : null;

  let range: RoundResults['range'] = null;
  let discrepancy: RoundResults['discrepancy'] = null;
  if (estimates.length) {
    const sorted = [...estimates].sort((a, b) => deckIndex(a.value) - deckIndex(b.value));
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    range = { min: low.value, max: high.value };
    if (low.value !== high.value) {
      discrepancy = { low: { name: low.name, value: low.value }, high: { name: high.name, value: high.value } };
    }
  }

  const groups: Record<string, VoteGroup> = {};
  for (const v of votes) {
    if (!mode || !isEstimate(v.value)) groups[v.id] = 'other';
    else if (v.value === mode.value) groups[v.id] = 'majority';
    else groups[v.id] = deckIndex(v.value) < deckIndex(mode.value) ? 'lower' : 'higher';
  }

  let agreement: AgreementKind | null = null;
  if (mode) {
    if (total >= 2 && mode.count === total) agreement = 'consensus';
    else if (mode.count * 2 > total) agreement = 'majority';
    else agreement = 'plurality';
  }

  const suggested = mode?.value ?? pickMode(votes.map((v) => v.value), deckIndex)?.value ?? null;

  return {
    votes,
    total,
    average,
    median: median(nums),
    sum,
    numericCount: nums.length,
    mode,
    range,
    distribution,
    groups,
    agreement,
    discrepancy,
    suggested,
  };
}

/** Formato es-ES con hasta 1 decimal. */
export function formatNumber(n: number): string {
  return n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

export function formatPct(n: number): string {
  return `${n.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%`;
}
