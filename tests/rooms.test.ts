import { describe, it, expect } from 'vitest';
import { createRoom } from '../src/server/game/rooms';

describe('createRoom', () => {
  it('produces a boss room at each boss interval', () => {
    expect(createRoom(5, () => 0).type).toBe('boss');
  });

  it('produces a non-boss room between boss intervals', () => {
    expect(createRoom(3, () => 0).type).not.toBe('boss');
  });

  it('scales difficulty up as the party goes deeper', () => {
    const shallow = createRoom(1, () => 0);
    const deep = createRoom(11, () => 0);
    expect(deep.difficulty).toBeGreaterThan(shallow.difficulty);
  });

  it('leaves the description empty for the AI to fill in', () => {
    expect(createRoom(1, () => 0).description).toBe('');
  });

  it('selects the first archetype when the roll is at the low end', () => {
    expect(createRoom(1, () => 0).type).toBe('combat');
  });
});
