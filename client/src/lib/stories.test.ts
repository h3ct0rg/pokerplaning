import { describe, expect, it } from 'vitest';
import type { Story } from '@shared/protocol';
import { storyView } from './stories';
import { formatDuration, roundElapsed } from './time';

const s = (id: string, estimate: string | null = null, estimatedAt: number | null = null): Story => ({
  id,
  key: id.toUpperCase(),
  title: `Historia ${id}`,
  estimate,
  estimatedAt,
});

describe('storyView', () => {
  const stories = [s('a', '5', 100), s('b'), s('c'), s('d', '½', 200), s('e')];

  it('actual, índice, cola rotada desde la actual y sin estimadas', () => {
    const v = storyView({ stories, currentStoryId: 'c' });
    expect(v.current?.id).toBe('c');
    expect(v.currentIndex).toBe(3);
    expect(v.total).toBe(5);
    expect(v.queue.map((x) => x.id)).toEqual(['e', 'b']);
    expect(v.skipTarget?.id).toBe('e');
    expect(v.nextTarget?.id).toBe('d');
  });

  it('historial más reciente primero y velocidad numérica (½ = 0.5)', () => {
    const v = storyView({ stories, currentStoryId: 'c' });
    expect(v.history.map((x) => x.id)).toEqual(['d', 'a']);
    expect(v.velocity).toBe(5.5);
  });

  it('sin actual', () => {
    const v = storyView({ stories: [s('a'), s('b', 'M', 1)], currentStoryId: null });
    expect(v.current).toBeNull();
    expect(v.queue.map((x) => x.id)).toEqual(['a']);
    expect(v.velocity).toBe(0);
    expect(v.nextTarget).toBeNull();
  });
});

describe('cronómetro', () => {
  it('formatDuration mm:ss y h:mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65_400)).toBe('01:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
    expect(formatDuration(-5)).toBe('00:00');
  });

  it('corrige desfase de reloj con serverNow y se congela al revelar', () => {
    // Reloj local 10 s atrasado respecto al servidor: offset = +10000.
    expect(roundElapsed(1_000_000, null, 10_000, 1_000_000)).toBe(10_000);
    expect(roundElapsed(1_000_000, 1_042_000, 10_000, 9_999_999)).toBe(42_000);
  });
});
