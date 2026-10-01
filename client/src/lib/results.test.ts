import { describe, expect, it } from 'vitest';
import { DECKS, type Participant } from '@shared/protocol';
import { computeResults, numericValue } from './results';

const fib = DECKS.fibonacci;
const p = (id: string, vote: string | null, role: Participant['role'] = 'player'): Participant => ({
  id,
  name: id.toUpperCase(),
  connected: true,
  role,
  hasVoted: vote !== null,
  vote,
  joinedAt: 0,
});

describe('numericValue', () => {
  it('½ vale 0.5, dígitos son números, resto null', () => {
    expect(numericValue('½')).toBe(0.5);
    expect(numericValue('13')).toBe(13);
    expect(numericValue('?')).toBeNull();
    expect(numericValue('☕')).toBeNull();
    expect(numericValue('XL')).toBeNull();
  });
});

describe('computeResults', () => {
  it('promedio y mediana solo con numéricos (½ = 0.5)', () => {
    const r = computeResults([p('a', '½'), p('b', '1'), p('c', '3'), p('d', '?'), p('e', '☕'), p('f', null)], fib);
    expect(r.total).toBe(5);
    expect(r.numericCount).toBe(3);
    expect(r.sum).toBe(4.5);
    expect(r.average).toBe(1.5);
    expect(r.median).toBe(1);
  });

  it('mediana con cantidad par promedia los centrales', () => {
    const r = computeResults([p('a', '2'), p('b', '3'), p('c', '5'), p('d', '8')], fib);
    expect(r.median).toBe(4);
  });

  it('moda con n/N y %; empate → valor mayor del mazo', () => {
    const r = computeResults([p('a', '3'), p('b', '3'), p('c', '8'), p('d', '8'), p('e', '1')], fib);
    expect(r.mode).toEqual({ value: '8', count: 2, pct: 40 });
    expect(r.suggested).toBe('8');
    expect(r.agreement).toBe('plurality');
  });

  it('?/☕ no cuentan para moda ni rango', () => {
    const r = computeResults([p('a', '?'), p('b', '?'), p('c', '5')], fib);
    expect(r.mode?.value).toBe('5');
    expect(r.range).toEqual({ min: '5', max: '5' });
    expect(r.groups).toEqual({ a: 'other', b: 'other', c: 'majority' });
  });

  it('rango, grupos y discrepancia por orden del mazo', () => {
    const r = computeResults(
      [p('gaston', '8'), p('maria', '8'), p('sofia', '8'), p('ana', '8'), p('carlos', '5'), p('pedro', '13')],
      fib,
    );
    expect(r.range).toEqual({ min: '5', max: '13' });
    expect(r.mode).toEqual({ value: '8', count: 4, pct: 66.7 });
    expect(r.agreement).toBe('majority');
    expect(r.groups).toMatchObject({ gaston: 'majority', carlos: 'lower', pedro: 'higher' });
    expect(r.discrepancy).toEqual({ low: { name: 'CARLOS', value: '5' }, high: { name: 'PEDRO', value: '13' } });
    expect(r.distribution.map((d) => d.value)).toEqual(['5', '8', '13']);
    expect(r.distribution[1]).toMatchObject({ count: 4, voters: ['GASTON', 'MARIA', 'SOFIA', 'ANA'] });
  });

  it('consenso cuando todos (≥2) votan igual; sin discrepancia', () => {
    const r = computeResults([p('a', '5'), p('b', '5')], fib);
    expect(r.agreement).toBe('consensus');
    expect(r.discrepancy).toBeNull();
  });

  it('mazo de tallas: sin promedio/mediana, rango por orden del mazo', () => {
    const r = computeResults([p('a', 'XS'), p('b', 'XXL'), p('c', 'M'), p('d', 'M')], DECKS.tshirt);
    expect(r.average).toBeNull();
    expect(r.median).toBeNull();
    expect(r.range).toEqual({ min: 'XS', max: 'XXL' });
    expect(r.mode?.value).toBe('M');
  });

  it('ignora espectadores', () => {
    const r = computeResults([p('a', '3'), p('s', '13', 'spectator')], fib);
    expect(r.total).toBe(1);
  });

  it('sin votos', () => {
    const r = computeResults([p('a', null)], fib);
    expect(r).toMatchObject({ total: 0, average: null, median: null, mode: null, range: null, agreement: null, suggested: null });
  });

  it('solo ?/☕: sugerido es el más votado aunque no haya moda', () => {
    const r = computeResults([p('a', '☕'), p('b', '☕'), p('c', '?')], fib);
    expect(r.mode).toBeNull();
    expect(r.suggested).toBe('☕');
  });
});
