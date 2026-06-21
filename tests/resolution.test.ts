import { describe, it, expect } from 'vitest';
import { prepareRoll, applyTurn } from '../src/server/game/resolution';
import type { GameState, ResolveResult } from '../src/shared/game';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    runNumber: 1,
    phase: 'awaiting_actions',
    postId: 't3_test',
    theme: 'catacombs',
    party: {
      hp: 50,
      maxHp: 50,
      gold: 0,
      depth: 0,
      inventory: [],
      statuses: [],
      classId: 'adventurer',
      name: 'Test Party',
    },
    room: {
      type: 'combat',
      description: 'a damp stone room',
      difficulty: 12,
      entities: [],
      threats: [],
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
    recentEvents: [],
    nextResolveAt: 0,
    voteThreshold: 20,
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
    ...overrides,
  };
}

function withClass(classId: GameState['party']['classId']): GameState {
  const base = makeState();
  return { ...base, party: { ...base.party, classId } };
}

describe('prepareRoll', () => {
  it('folds the class affinity into the roll', () => {
    // die forced to 10, difficulty 12. Adventurer (+0) -> 10 -> partial.
    expect(prepareRoll(withClass('adventurer'), () => 0.45).outcome).toBe(
      'partial'
    );
    // Warrior in a combat room (+3) -> 13 -> success on the same die.
    expect(prepareRoll(withClass('warrior'), () => 0.45).outcome).toBe(
      'success'
    );
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
});