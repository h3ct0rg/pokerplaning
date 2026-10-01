import { describe, expect, it } from 'vitest';
import { initials } from './initials';

describe('initials', () => {
  it.each([
    ['Gastón Ferrufino', 'GF'],
    ['Ana', 'AN'],
    ['Sofía (QA)', 'SQ'],
    ['  María  José  Pérez ', 'MP'],
    ['(QA)', 'QA'],
    ['¡!', '?'],
    ['', '?'],
  ])('%j → %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
