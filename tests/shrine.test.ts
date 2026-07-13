import { describe, it, expect } from 'vitest';
import {
  shrineOffer,
  resolveShrine,
  shrineEffects,
  shrineDirective,
  withShrineOffer,
} from '../src/server/game/shrine';
import { applyTurn } from '../src/server/game/resolution';
import type { GameState, ResolveResult, RoomType } from '../src/shared/game';

function makeState(
  opts: {
    hp?: number;
    embers?: number;
    depth?: number;
    roomType?: RoomType;
    suggestions?: string[];
  } = {}
): GameState {
  const {
    hp = 20,
    embers = 30,
    depth = 0,
    roomType = 'shop',
    suggestions = [],
  } = opts;
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
      description: 'a hollow ringed with cold stone',
      difficulty: 12,
      entities: [],
      threats: [],
      suggestions,
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
    narration: 'the party makes an offering',
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

describe('shrineOffer', () => {
  it('returns null outside a shop room', () => {
    expect(shrineOffer(makeState({ roomType: 'combat' }))).toBeNull();
  });

  it('returns null at full health', () => {
    expect(shrineOffer(makeState({ hp: 50 }))).toBeNull();
  });

  it('returns null when the party cannot afford it', () => {
    expect(shrineOffer(makeState({ embers: 5 }))).toBeNull();
  });

  it('offers a heal when wounded and able to pay', () => {
    expect(shrineOffer(makeState())).toEqual({
      cost: 12,
      label: 'Offer 12 embers to heal',
    });
  });

  it('charges more the deeper the party has descended', () => {
    expect(shrineOffer(makeState({ depth: 3, embers: 40 }))).toEqual({
      cost: 18,
      label: 'Offer 18 embers to heal',
    });
  });
});

describe('resolveShrine', () => {
  it('returns null when there is no live offer', () => {
    expect(
      resolveShrine(makeState({ hp: 50 }), 'Offer 12 embers to heal')
    ).toBeNull();
  });

  it('returns null for an action that is not an offering', () => {
    expect(resolveShrine(makeState(), 'search the room')).toBeNull();
  });

  it('resolves the tapped offer suggestion', () => {
    expect(resolveShrine(makeState(), 'Offer 12 embers to heal')).toEqual({
      cost: 12,
      heal: 25,
    });
  });

  it('resolves a typed offering too', () => {
    expect(
      resolveShrine(makeState(), 'I give some embers to the altar')
    ).toEqual({
      cost: 12,
      heal: 25,
    });
  });
});

describe('shrineEffects', () => {
  it('spends the embers, restores health, and pays no reward', () => {
    expect(shrineEffects({ cost: 12, heal: 25 })).toEqual({
      hpDelta: 25,
      embersDelta: -12,
      resolve: true,
      reward: false,
    });
  });
});

describe('shrineDirective', () => {
  it('names the cost and forbids new danger', () => {
    const text = shrineDirective({ cost: 12, heal: 25 });
    expect(text).toContain('12 embers');
    expect(text).toContain('no new threat');
  });
});

describe('withShrineOffer', () => {
  it('adds the offer as the first suggestion in a shop room', () => {
    const state = withShrineOffer(
      makeState({ suggestions: ['Study the altar'] })
    );
    expect(state.room.suggestions[0]).toBe('Offer 12 embers to heal');
    expect(state.room.suggestions).toHaveLength(2);
  });

  it('does not stack duplicates when run twice', () => {
    const once = withShrineOffer(makeState());
    const twice = withShrineOffer(once);
    const offers = twice.room.suggestions.filter(
      (s) => s === 'Offer 12 embers to heal'
    );
    expect(offers).toHaveLength(1);
  });

  it('leaves suggestions untouched when there is no offer', () => {
    const state = makeState({ hp: 50, suggestions: ['Study the altar'] });
    expect(withShrineOffer(state).room.suggestions).toEqual([
      'Study the altar',
    ]);
  });
});

describe('applyTurn with a shrine offering', () => {
  it('spends embers, heals, advances, and pays no reward', () => {
    const state = makeState({ hp: 20, embers: 30, depth: 0 });
    const shrine = resolveShrine(state, 'Offer 12 embers to heal');
    if (shrine === null) throw new Error('expected an offering');
    const next = applyTurn(state, makeResult(), () => 0, shrineEffects(shrine));
    expect(next.party.hp).toBe(45); // 20 + 25
    expect(next.party.embers).toBe(18); // 30 - 12, no reward added
    expect(next.party.depth).toBe(1);
  });
});
