import { describe, expect, it } from 'vitest';
import { seatPositions } from './Table';

describe('seatPositions', () => {
  it('2 → arriba y abajo', () => {
    expect(seatPositions(2)).toEqual([{ x: 0, y: -1 }, { x: 0, y: 1 }]);
  });

  it('6 → 3 arriba y 3 abajo, sin lados', () => {
    const p = seatPositions(6);
    expect(p.filter((s) => s.y === -1)).toHaveLength(3);
    expect(p.filter((s) => s.y === 1)).toHaveLength(3);
  });

  it('10 → 4 arriba, 4 abajo y uno a cada lado; sin posiciones repetidas', () => {
    const p = seatPositions(10);
    expect(p).toHaveLength(10);
    expect(p.filter((s) => s.y === 0).map((s) => s.x).sort()).toEqual([-1, 1]);
    expect(new Set(p.map((s) => `${s.x},${s.y}`)).size).toBe(10);
    expect(p.every((s) => Math.abs(s.x) <= 1 && Math.abs(s.y) <= 1)).toBe(true);
  });
});
