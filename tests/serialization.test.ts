import { describe, it, expect } from 'vitest';
import {
  serializeGame,
  deserializeGame,
} from '../src/server/data/serialization';
import { createInitialState } from '../src/server/game/state';
import { CLASSES } from '../src/server/game/classes';

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

  it('backfills the map on a saved game that predates it', () => {
    const noMap = JSON.parse(serializeGame(sample)) as Record<string, unknown>;
    delete noMap.map;
    const restored = deserializeGame(JSON.stringify(noMap));
    expect(restored?.map.nodes.length).toBeGreaterThanOrEqual(2);
    expect(restored?.map.currentNodeIndex).toBe(0);
  });

  it('migrates an older save that used free-text statuses', () => {
    const legacy = JSON.parse(serializeGame(sample)) as Record<string, unknown>;
    const party = legacy.party as Record<string, unknown>;
    delete party.conditions;
    party.statuses = ['poisoned', 'blessed'];
    const restored = deserializeGame(JSON.stringify(legacy));
    expect(restored?.party.conditions).toEqual(['poisoned']); // migrated, unknown dropped
  });

  it('backfills intro on a save that predates the cold open', () => {
    const legacy = JSON.parse(serializeGame(sample)) as Record<string, unknown>;
    delete legacy.intro;
    const restored = deserializeGame(JSON.stringify(legacy));
    expect(restored?.intro).toBe('');
  });

  it('backfills party abilities from the class on an older save', () => {
    const parsed = JSON.parse(serializeGame(sample)) as {
      party: Record<string, unknown>;
    };
    delete parsed.party.abilities;
    const restored = deserializeGame(JSON.stringify(parsed));
    expect(restored?.party.abilities).toEqual(
      CLASSES[sample.party.classId].abilities
    );
  });
});

describe('roomFailures migration', () => {
  it('backfills roomFailures on a save that predates it', () => {
    const legacy = JSON.parse(serializeGame(sample)) as Record<string, unknown>;
    delete legacy.roomFailures;
    const restored = deserializeGame(JSON.stringify(legacy));
    expect(restored?.roomFailures).toBe(0);
  });
});

describe('embers migration', () => {
  it('carries a legacy gold balance over to embers', () => {
    const legacy = JSON.parse(serializeGame(sample)) as Record<string, unknown>;
    const party = legacy.party as Record<string, unknown>;
    delete party.embers;
    party.gold = 42;
    const restored = deserializeGame(JSON.stringify(legacy));
    expect(restored?.party.embers).toBe(42);
  });

  it('defaults embers to zero when a save has neither field', () => {
    const legacy = JSON.parse(serializeGame(sample)) as Record<string, unknown>;
    const party = legacy.party as Record<string, unknown>;
    delete party.embers;
    const restored = deserializeGame(JSON.stringify(legacy));
    expect(restored?.party.embers).toBe(0);
  });
});