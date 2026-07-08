import { describe, it, expect } from 'vitest';
import { rollTurn } from '../src/server/game/resolution';
import {
  maybeSurvive,
  CURSE_DIFFICULTY_DROP,
} from '../src/server/game/signatures';
import type { GameState, Party, RoomType } from '../src/shared/game';

function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    hp: 50,
    maxHp: 50,
    embers: 0,
    depth: 0,
    inventory: [],
    conditions: [],
    classId: 'adventurer',
    name: 'Ash',
    abilities: { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 },
    ...overrides,
  };
}

function makeState(party: Party, roomType: RoomType = 'combat'): GameState {
  return {
    runNumber: 1,
    phase: 'awaiting_actions',
    postId: 't3_test',
    theme: 'catacombs',
    nemesisLine: '',
    party,
    room: {
      type: roomType,
      description: 'a damp stone room',
      difficulty: 12,
      entities: [],
      threats: [],
      suggestions: [],
      situation: {},
    },
    map: {
      nodes: [{ id: 'n1', name: 'One', themeTag: 'first', cleared: false }],
      currentNodeIndex: 0,
      finalBoss: { name: 'Boss', defeated: false },
    },
    intro: '',
    recentEvents: [],
    nextResolveAt: 0,
    voteThreshold: 20,
    roomFailures: 0,
  };
}

describe('Fighter — killing blow save', () => {
  it('survives one lethal blow at 1 HP and marks it spent', () => {
    const party = makeParty({ classId: 'warrior', hp: 0 });
    const result = maybeSurvive(party, true);
    expect(result.died).toBe(false);
    expect(result.party.hp).toBe(1);
    expect(result.party.killingBlowUsed).toBe(true);
    expect(result.note).not.toBeNull();
  });

  it('falls on the second lethal blow once the save is spent', () => {
    const party = makeParty({ classId: 'warrior', killingBlowUsed: true });
    const result = maybeSurvive(party, true);
    expect(result.died).toBe(true);
    expect(result.note).toBeNull();
  });

  it('does not save a non-Fighter', () => {
    const result = maybeSurvive(makeParty({ classId: 'trickster' }), true);
    expect(result.died).toBe(true);
  });

  it('leaves a survivor untouched', () => {
    const party = makeParty({ classId: 'warrior' });
    const result = maybeSurvive(party, false);
    expect(result.died).toBe(false);
    expect(result.party.killingBlowUsed).toBeUndefined();
    expect(result.note).toBeNull();
  });
});

describe('Rogue — floor reroll', () => {
  it('rerolls a failed check and marks the floor spent', () => {
    const state = makeState(makeParty({ classId: 'trickster' }));
    const { check, party, note } = rollTurn(state, () => 0);
    expect(check.outcome).toBe('fail');
    expect(note).not.toBeNull();
    expect(party.rerollDepth).toBe(0);
  });

  it('does not reroll again on the same floor', () => {
    const state = makeState(
      makeParty({ classId: 'trickster', rerollDepth: 0 })
    );
    const { note } = rollTurn(state, () => 0);
    expect(note).toBeNull();
  });
});

describe('Wizard — floor curse', () => {
  it('eases a combat check and marks the floor spent', () => {
    const state = makeState(makeParty({ classId: 'witch' }));
    const { check, party, note } = rollTurn(state, () => 0);
    expect(check.difficulty).toBe(12 - CURSE_DIFFICULTY_DROP);
    expect(party.curseDepth).toBe(0);
    expect(note).not.toBeNull();
  });

  it('does not curse outside combat', () => {
    const state = makeState(makeParty({ classId: 'witch' }), 'puzzle');
    const { check, note } = rollTurn(state, () => 0);
    expect(check.difficulty).toBe(12);
    expect(note).toBeNull();
  });

  it('does not curse again on the same floor', () => {
    const state = makeState(makeParty({ classId: 'witch', curseDepth: 0 }));
    const { check, note } = rollTurn(state, () => 0);
    expect(check.difficulty).toBe(12);
    expect(note).toBeNull();
  });
});