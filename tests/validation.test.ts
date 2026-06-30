import { describe, it, expect } from 'vitest';
import { applyResolveResult } from '../src/server/game/validation';
import type { Party, ResolveResult } from '../src/shared/game';

function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    hp: 50,
    maxHp: 50,
    gold: 100,
    depth: 0,
    inventory: [],
    conditions: [],
    classId: 'adventurer',
    name: 'Test Party',
    abilities: { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 },
    ...overrides,
  };
}

function makeResult(overrides: Partial<ResolveResult> = {}): ResolveResult {
  return {
    narration: '',
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

describe('applyResolveResult', () => {
  it('applies a normal hp loss', () => {
    const { party } = applyResolveResult(
      makeParty({ hp: 40 }),
      makeResult({ hpDelta: -10 })
    );
    expect(party.hp).toBe(30);
  });

  it('never drops hp below 0 and reports death', () => {
    const { party, died } = applyResolveResult(
      makeParty({ hp: 8 }),
      makeResult({ hpDelta: -20 })
    );
    expect(party.hp).toBe(0);
    expect(died).toBe(true);
  });

  it('never heals above maxHp', () => {
    const { party } = applyResolveResult(
      makeParty({ hp: 45, maxHp: 50 }),
      makeResult({ hpDelta: 20 })
    );
    expect(party.hp).toBe(50);
  });

  it('clamps an absurd damage value and records the adjustment', () => {
    const { party, adjustments } = applyResolveResult(
      makeParty({ hp: 50, maxHp: 50 }),
      makeResult({ hpDelta: -9999 })
    );
    expect(party.hp).toBe(25);
    expect(adjustments.length).toBeGreaterThan(0);
  });

  it('clamps an absurd heal value', () => {
    const { party } = applyResolveResult(
      makeParty({ hp: 10, maxHp: 50 }),
      makeResult({ hpDelta: 9999 })
    );
    expect(party.hp).toBe(35);
  });

  it('never lets gold go negative', () => {
    const { party } = applyResolveResult(
      makeParty({ gold: 10 }),
      makeResult({ goldDelta: -50 })
    );
    expect(party.gold).toBe(0);
  });

  it('adds and removes inventory items', () => {
    const { party } = applyResolveResult(
      makeParty({ inventory: ['rusty key'] }),
      makeResult({ inventoryAdd: ['torch'], inventoryRemove: ['rusty key'] })
    );
    expect(party.inventory).toEqual(['torch']);
  });

  it('records an adjustment when removing an item the party lacks', () => {
    const { party, adjustments } = applyResolveResult(
      makeParty({ inventory: [] }),
      makeResult({ inventoryRemove: ['excalibur'] })
    );
    expect(party.inventory).toEqual([]);
    expect(adjustments.some((a) => a.includes('excalibur'))).toBe(true);
  });

  it('keeps only known conditions when adding, ignoring duplicates', () => {
    const { party } = applyResolveResult(
      makeParty({ conditions: ['poisoned'] }),
      makeResult({ statusAdd: ['poisoned', 'blessed'] })
    );
    expect(party.conditions).toEqual(['poisoned']); // dupe ignored, 'blessed' dropped
  });

  it('removes a condition', () => {
    const { party } = applyResolveResult(
      makeParty({ conditions: ['poisoned', 'frightened'] }),
      makeResult({ statusRemove: ['poisoned'] })
    );
    expect(party.conditions).toEqual(['frightened']);
  });

  it('ignores a false death claim from the AI when hp survives', () => {
    const { died } = applyResolveResult(
      makeParty({ hp: 40 }),
      makeResult({ hpDelta: -5, death: true })
    );
    expect(died).toBe(false);
  });

  it('reports death from hp even if the AI claims otherwise', () => {
    const { died } = applyResolveResult(
      makeParty({ hp: 3 }),
      makeResult({ hpDelta: -10, death: false })
    );
    expect(died).toBe(true);
  });

  it('does not mutate the original party', () => {
    const party = makeParty({ hp: 50, inventory: ['torch'] });
    applyResolveResult(
      party,
      makeResult({ hpDelta: -10, inventoryAdd: ['sword'] })
    );
    expect(party.hp).toBe(50);
    expect(party.inventory).toEqual(['torch']);
  });
});

describe('condition health drain', () => {
  it('drains health each turn from lingering conditions', () => {
    const { party } = applyResolveResult(
      makeParty({ hp: 50, conditions: ['poisoned'] }),
      makeResult({ hpDelta: 0 })
    );
    expect(party.hp).toBe(49);
  });
});