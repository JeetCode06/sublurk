import { describe, it, expect } from 'vitest';
import {
  prepareRoll,
  applyTurn,
  STUCK_LIMIT,
} from '../src/server/game/resolution';
import type { GameState, ResolveResult } from '../src/shared/game';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    runNumber: 1,
    phase: 'awaiting_actions',
    postId: 't3_test',
    theme: 'catacombs',
    nemesisLine: '',
    party: {
      hp: 50,
      maxHp: 50,
      gold: 0,
      depth: 0,
      inventory: [],
      conditions: [],
      classId: 'adventurer',
      name: 'Test Party',
      abilities: { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 },
    },
    room: {
      type: 'combat',
      description: 'a damp stone room',
      difficulty: 12,
      entities: [],
      threats: [],
      suggestions: [],
      situation: {},
    },
    map: {
      nodes: [
        { id: 'n1', name: 'One', themeTag: 'first', cleared: false },
        { id: 'n2', name: 'Two', themeTag: 'second', cleared: false },
        { id: 'n3', name: 'Three', themeTag: 'third', cleared: false },
      ],
      currentNodeIndex: 0,
      finalBoss: { name: 'Boss', defeated: false },
    },
    intro: '',
    recentEvents: [],
    nextResolveAt: 0,
    voteThreshold: 20,
    roomFailures: 0,
    ...overrides,
  };
}

function makeResult(overrides: Partial<ResolveResult> = {}): ResolveResult {
  return {
    narration: 'something happens',
    outcome: 'success',
    hpDelta: 0,
    goldDelta: 0,
    inventoryAdd: [],
    inventoryRemove: [],
    statusAdd: [],
    statusRemove: [],
    roomResolved: false,
    nextRoomHint: null,
    death: false,
    suggestions: [],
    ...overrides,
  };
}

function withClass(classId: GameState['party']['classId']): GameState {
  const base = makeState();
  return { ...base, party: { ...base.party, classId } };
}

describe('prepareRoll', () => {
  it('rolls the room ability using the party score and class advantage', () => {
    const adventurer = prepareRoll(withClass('adventurer'), () => 0.45);
    expect(adventurer.ability).toBe('str'); // a combat room tests strength
    expect(adventurer.modifier).toBe(1); // score 12 -> +1
    expect(adventurer.advantage).toBe('normal');

    const warrior = prepareRoll(withClass('warrior'), () => 0.45);
    expect(warrior.advantage).toBe('advantage'); // strong in combat
  });

  it('lets a finesse class fight with Dexterity in combat', () => {
    const base = makeState();
    const finesse = {
      ...base,
      party: {
        ...base.party,
        abilities: { ...base.party.abilities, str: 10, dex: 16 },
      },
    };
    const roll = prepareRoll(finesse, () => 0.45);
    expect(roll.ability).toBe('dex'); // dex 16 > str 10
  });
});

describe('applyTurn', () => {
  it('ends the run when the party dies', () => {
    const next = applyTurn(
      makeState({ party: { ...makeState().party, hp: 5 } }),
      makeResult({ hpDelta: -20 })
    );
    expect(next.phase).toBe('dead');
    expect(next.party.hp).toBe(0);
  });

  it('advances to a new room and increments depth when the room resolves', () => {
    const start = makeState({ party: { ...makeState().party, depth: 2 } });
    const next = applyTurn(start, makeResult({ roomResolved: true }), () => 0);
    expect(next.party.depth).toBe(3);
    expect(next.phase).toBe('awaiting_actions');
    expect(next.room).not.toBe(start.room);
  });

  it('awards gold scaled to difficulty when a room is genuinely cleared', () => {
    const next = applyTurn(
      makeState(),
      makeResult({ roomResolved: true }),
      () => 0
    );
    expect(next.party.gold).toBe(12); // room difficulty 12
  });

  it('awards no gold when the party is only forced onward', () => {
    const next = applyTurn(
      makeState({ roomFailures: STUCK_LIMIT - 1 }),
      makeResult({ outcome: 'fail', roomResolved: false })
    );
    expect(next.party.depth).toBe(1);
    expect(next.party.gold).toBe(0);
  });

  it('keeps the same room when it is not resolved', () => {
    const start = makeState();
    const next = applyTurn(start, makeResult({ roomResolved: false }));
    expect(next.room).toEqual(start.room);
  });

  it('generates a boss room when depth reaches the interval', () => {
    const start = makeState({ party: { ...makeState().party, depth: 4 } });
    const next = applyTurn(start, makeResult({ roomResolved: true }), () => 0);
    expect(next.party.depth).toBe(5);
    expect(next.room.type).toBe('boss');
  });

  it('records narration and caps the recent-events history', () => {
    let state = makeState();
    for (let i = 0; i < 10; i++) {
      state = applyTurn(state, makeResult({ narration: `event ${i}` }));
    }
    expect(state.recentEvents.length).toBeLessThanOrEqual(6);
    expect(state.recentEvents.at(-1)).toBe('event 9');
  });

  it('does not mutate the original state', () => {
    const start = makeState({ party: { ...makeState().party, hp: 50 } });
    applyTurn(start, makeResult({ hpDelta: -10 }));
    expect(start.party.hp).toBe(50);
  });

  it('wins the run when the final boss is resolved', () => {
    const state = makeState({
      map: {
        nodes: [
          { id: 'n1', name: 'One', themeTag: 'first', cleared: true },
          { id: 'n2', name: 'Two', themeTag: 'second', cleared: true },
          { id: 'n3', name: 'Three', themeTag: 'third', cleared: false },
        ],
        currentNodeIndex: 2,
        finalBoss: { name: 'Boss', defeated: false },
      },
    });
    const next = applyTurn(state, makeResult({ roomResolved: true }), () => 0);
    expect(next.phase).toBe('won');
    expect(next.map.finalBoss.defeated).toBe(true);
  });

  it('spawns the final boss room on reaching the last location', () => {
    const base = makeState({
      map: {
        nodes: [
          { id: 'n1', name: 'One', themeTag: 'first', cleared: true },
          { id: 'n2', name: 'Two', themeTag: 'second', cleared: false },
          { id: 'n3', name: 'Three', themeTag: 'third', cleared: false },
        ],
        currentNodeIndex: 1,
        finalBoss: { name: 'Boss', defeated: false },
      },
    });
    const state = { ...base, party: { ...base.party, depth: 5 } };
    const next = applyTurn(state, makeResult({ roomResolved: true }), () => 0);
    expect(next.phase).toBe('awaiting_actions');
    expect(next.room.type).toBe('boss');
    expect(next.map.currentNodeIndex).toBe(2);
  });
});

describe('applyTurn suggestions', () => {
  it('refreshes the room suggestions on a turn that does not resolve', () => {
    const next = applyTurn(
      makeState(),
      makeResult({ roomResolved: false, suggestions: ['Flee', 'Fight'] })
    );
    expect(next.room.suggestions).toEqual(['Flee', 'Fight']);
  });
});

describe('applyTurn stuck handling', () => {
  it('counts consecutive failures and resets them on a non-failure', () => {
    const failed = applyTurn(
      makeState({ roomFailures: 1 }),
      makeResult({ outcome: 'fail', roomResolved: false })
    );
    expect(failed.roomFailures).toBe(2);

    const recovered = applyTurn(
      makeState({ roomFailures: 3 }),
      makeResult({ outcome: 'success', roomResolved: false })
    );
    expect(recovered.roomFailures).toBe(0);
  });

  it('forces the party onward after too many failures', () => {
    const next = applyTurn(
      makeState({ roomFailures: STUCK_LIMIT - 1 }),
      makeResult({ outcome: 'fail', roomResolved: false })
    );
    expect(next.party.depth).toBe(1);
    expect(next.roomFailures).toBe(0);
  });
});