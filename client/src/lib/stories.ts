import type { RoomState, Story } from '@shared/protocol';
import { numericValue } from './results';

export interface StoryView {
  current: Story | null;
  /** Posición 1-based de la actual en la cola completa. */
  currentIndex: number;
  total: number;
  /** Pendientes (sin estimar) distintas de la actual, en orden de cola empezando tras la actual. */
  queue: Story[];
  /** Estimadas, de la más reciente a la más antigua. */
  history: Story[];
  /** Suma de estimaciones numéricas confirmadas. */
  velocity: number;
  /** Siguiente pendiente para "Saltar" (o null). */
  skipTarget: Story | null;
  /** Siguiente en orden de cola para "Siguiente historia" (o null). */
  nextTarget: Story | null;
}

export function storyView(room: Pick<RoomState, 'stories' | 'currentStoryId'>): StoryView {
  const { stories, currentStoryId } = room;
  const idx = stories.findIndex((s) => s.id === currentStoryId);
  const current = idx >= 0 ? stories[idx] : null;

  const rotated = idx >= 0 ? [...stories.slice(idx + 1), ...stories.slice(0, idx)] : stories;
  const queue = rotated.filter((s) => s.estimate === null && s.id !== currentStoryId);

  const history = stories
    .filter((s) => s.estimate !== null)
    .sort((a, b) => (b.estimatedAt ?? 0) - (a.estimatedAt ?? 0));

  const velocity =
    Math.round(history.reduce((sum, s) => sum + (numericValue(s.estimate ?? '') ?? 0), 0) * 10) / 10;

  return {
    current,
    currentIndex: idx + 1,
    total: stories.length,
    queue,
    history,
    velocity,
    skipTarget: queue[0] ?? null,
    nextTarget: idx >= 0 && idx + 1 < stories.length ? stories[idx + 1] : null,
  };
}
