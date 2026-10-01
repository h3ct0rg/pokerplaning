import { describe, expect, it } from 'vitest';
import { parseRoomInput, roomPath } from './roomCode';

describe('parseRoomInput', () => {
  it.each([
    ['AB7K9X', 'AB7K9X'],
    ['  ab7k9x ', 'AB7K9X'],
    ['#AB7K9X', 'AB7K9X'],
    ['https://poker.example.com/r/AB7K9X', 'AB7K9X'],
    ['http://localhost:5173/r/ab7k9x?x=1#y', 'AB7K9X'],
    ['https://poker.example.com/room/AB7K9X', 'AB7K9X'],
    ['localhost:3001/r/AB7K9X/', 'AB7K9X'],
  ])('%s → %s', (input, expected) => {
    expect(parseRoomInput(input)).toBe(expected);
  });

  it.each(['', '   ', 'ABC', 'AB7K9XZ', 'AB0K9X' /* 0 no está en el alfabeto */, 'https://x.com/r/', 'https://x.com/s/AB7K9X'])(
    'rechaza %j',
    (input) => {
      expect(parseRoomInput(input)).toBeNull();
    },
  );
});

describe('roomPath', () => {
  it('ruta canónica /r/CODE', () => {
    expect(roomPath('AB7K9X')).toBe('/r/AB7K9X');
  });
});
