import { describe, it, expect } from 'vitest';
import {
  resolveRest,
  restEffects,
  restDirective,
} from '../src/server/game/healing';
import { applyTurn } from '../src/server/game/resolution';
import type {
  AbilityCheck,
  GameState,
  Outcome,
  ResolveResult,
  RoomType,
} from '../src/shared/game';

function check(outcome: Outcome): AbilityCheck {
  return {
    ability: 'con',
    advantage: 'normal',
    rolls: [12],
    die: 12,
    modifier: 1,
    total: 13,
    difficulty: 12,
    outcome,
  };
}

function makeState(
  opts: {
    hp?: number;
    embers?: number;
    depth?: number;
    roomType?: RoomType;
  } = {}
): GameState {
  const { hp = 20, embers = 0, depth = 0, roomType = 'rest' } = opts;
  return {
    runNumber: 1,
    phase: 'awaiting_actions',
    postId: 't3_test',
    nemesisLine: '',
    party: {
      hp,
      maxHp: 50,
      embers,
      depth,
      inventory: [],
      conditions: [],
      classId: 'adventurer',
      name: 'Test Party',
      abilities: { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 },
    },
    room: {
      type: roomType,
      description: 'a warm hollow out of the wind',
      difficulty: 10,
      entities: [],
      threats: [],
      suggestions: [],
    },
    map: {
      nodes: [{ id: 'n1', name: 'One', themeTag: 'first', cleared: false }],
      currentNodeIndex: 0,
      finalBoss: { name: 'Boss', defeated: false },
    },
    intro: '',
    recentEvents: [],
    nextResolveAt: 0,
    roomFailures: 0,
  };
}

function makeResult(overrides: Partial<ResolveResult> = {}): ResolveResult {
  return {
    narration: 'the party rests',
    outcome: 'success',
    hpDelta: 0,
    embersDelta: 0,
    inventoryAdd: [],
    inventoryRemove: [],
    statusAdd: [],
    statusRemove: [],
    roomResolved: false,
    death: false,
    suggestions: [],
    ...overrides,
  };
}

describe('resolveRest', () => {
  it('returns null outside a rest room', () => {
    expect(
      resolveRest(makeState({ roomType: 'combat' }), check('success'))
    ).toBeNull();
  });

  it('heals a fraction of max health, scaled by the rest quality', () => {
    expect(resolveRest(makeState(), check('success'))?.heal).toBe(23); // ceil(50 * 0.45)
    expect(resolveRest(makeState(), check('partial'))?.heal).toBe(14); // ceil(50 * 0.28)
    expect(resolveRest(makeState(), check('fail'))?.heal).toBe(5); // ceil(50 * 0.1)
  });

  it('marks a good rest deep and a failed one shallow', () => {
    expect(resolveRest(makeState(), check('success'))?.deep).toBe(true);
    expect(resolveRest(makeState(), check('partial'))?.deep).toBe(true);
    expect(resolveRest(makeState(), check('fail'))?.deep).toBe(false);
  });
});

describe('restEffects', () => {
  it('recovers health and ends the room without paying embers', () => {
    const effects = restEffects({ heal: 23, deep: true });
    expect(effects.hpDelta).toBe(23);
    expect(effects.resolve).toBe(true);
    expect(effects.reward).toBe(false);
    expect(effects.entities).toBeUndefined();
  });
});

describe('restDirective', () => {
  it('keeps the beat safe and matches the rest quality', () => {
    const deep = restDirective({ heal: 23, deep: true });
    expect(deep).toContain('respite');
    expect(deep).toContain('no new threat');

    const shallow = restDirective({ heal: 5, deep: false });
    expect(shallow).toContain('fitful');
    expect(shallow).toContain('a little');
  });
});

describe('applyTurn with a rest', () => {
  it('heals the party, advances, and pays no embers', () => {
    const state = makeState({ hp: 20, embers: 5, depth: 2 });
    const rest = resolveRest(state, check('success'));
    if (rest === null) throw new Error('expected a rest');
    const next = applyTurn(state, makeResult(), () => 0, restEffects(rest));
    expect(next.party.hp).toBe(43); // 20 + 23
    expect(next.party.embers).toBe(5); // resting is not a victory
    expect(next.party.depth).toBe(3); // moved on
  });

  it('never heals past maximum health', () => {
    const state = makeState({ hp: 45 });
    const rest = resolveRest(state, check('success'));
    if (rest === null) throw new Error('expected a rest');
    const next = applyTurn(state, makeResult(), () => 0, restEffects(rest));
    expect(next.party.hp).toBe(50);
  });

  it('advances even after a poor rest', () => {
    const state = makeState({ hp: 20, depth: 1 });
    const rest = resolveRest(state, check('fail'));
    if (rest === null) throw new Error('expected a rest');
    const next = applyTurn(
      state,
      makeResult({ outcome: 'fail' }),
      () => 0,
      restEffects(rest)
    );
    expect(next.party.hp).toBe(25); // 20 + 5
    expect(next.party.depth).toBe(2);
  });
});
