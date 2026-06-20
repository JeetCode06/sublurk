import { describe, it, expect } from 'vitest';
import {
  serializeGame,
  deserializeGame,
} from '../src/server/data/serialization';
import { createInitialState } from '../src/server/game/state';

const sample = createInitialState({
  postId: 't3_abc',
  subredditName: 'r/witchcraft',
  classId: 'witch',
  theme: 'mossy catacombs',
});

describe('serialization', () => {
  it('round-trips a game state without loss', () => {
    expect(deserializeGame(serializeGame(sample))).toEqual(sample);
  });

  it('returns null for invalid JSON', () => {
    expect(deserializeGame('not json {')).toBeNull();
  });

  it('returns null for JSON that is not a game state', () => {
    expect(deserializeGame('{"hello":"world"}')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(deserializeGame('')).toBeNull();
  });

  it('backfills scene fields missing from an older saved game', () => {
    const legacy = JSON.stringify({
      ...sample,
      room: {
        type: sample.room.type,
        description: 'an old room',
        difficulty: sample.room.difficulty,
        situation: {},
      },
    });
    const restored = deserializeGame(legacy);
    expect(restored?.room.entities).toEqual([]);
    expect(restored?.room.threats).toEqual([]);
    expect(restored?.room.description).toBe('an old room');
  });
});