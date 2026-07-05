import { describe, it, expect } from 'vitest';
import {
  resolveCombat,
  combatDirective,
  combatEffects,
  type CombatResult,
} from '../src/server/game/combat';
import type {
  AbilityCheck,
  GameState,
  Outcome,
  RoomType,
  SceneEntity,
} from '../src/shared/game';

function foe(name: string, hp: number, threat: number): SceneEntity {
  return { kind: 'foe', name, blurb: '', hp, maxHp: hp, threat };
}

function check(outcome: Outcome, die: number): AbilityCheck {
  return {
    ability: 'str',
    advantage: 'normal',
    rolls: [die],
    die,
    modifier: 1,
    total: die + 1,
    difficulty: 12,
    outcome,
  };
}

// The party has str 12 (a +1 combat modifier) and dex 10, so combat resolves on
// Strength; depth is 0 unless a test overrides it.
function makeState(
  entities: SceneEntity[],
  opts: { depth?: number; roomType?: RoomType } = {}
): GameState {
  const { depth = 0, roomType = 'combat' } = opts;
  return {
    runNumber: 1,
    phase: 'awaiting_actions',
    postId: 't3_test',
    theme: 'catacombs',
    nemesisLine: '',
    party: {
      hp: 50,
      maxHp: 50,
      embers: 0,
      depth,
      inventory: [],
      conditions: [],
      classId: 'adventurer',
      name: 'Test Party',
      abilities: { str: 12, dex: 10, con: 12, int: 12, wis: 12, cha: 12 },
    },
    room: {
      type: roomType,
      description: 'a damp stone room',
      difficulty: 12,
      entities,
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

// resolveCombat returns null outside a fight; every test below that expects an
// exchange asserts it happened, then works with the narrowed result.
function fight(state: GameState, roll: AbilityCheck): CombatResult {
  const combat = resolveCombat(state, roll);
  if (combat === null) throw new Error('expected a combat exchange');
  return combat;
}

describe('resolveCombat', () => {
  it('returns null outside combat and boss rooms', () => {
    const state = makeState([foe('Lurker', 18, 3)], { roomType: 'puzzle' });
    expect(resolveCombat(state, check('success', 15))).toBeNull();
  });

  it('returns null when there is nothing living to fight', () => {
    const empty = makeState([{ kind: 'object', name: 'Lever', blurb: '' }]);
    expect(resolveCombat(empty, check('success', 15))).toBeNull();

    const dead = makeState([foe('Corpse', 0, 3)]);
    expect(resolveCombat(dead, check('success', 15))).toBeNull();
  });

  it('deals full damage to the first living foe on a success', () => {
    const combat = fight(
      makeState([foe('Lurker', 18, 3)]),
      check('success', 15)
    );
    expect(combat.playerDamage).toBe(6); // 5 base + 1 mod + 0 depth
    expect(combat.updatedEntities[0]?.hp).toBe(12);
    expect(combat.targetName).toBe('Lurker');
    expect(combat.targetSlain).toBe(false);
    expect(combat.allFoesDead).toBe(false);
  });

  it('lands a partial hit for half damage, rounded up', () => {
    const combat = fight(
      makeState([foe('Lurker', 18, 3)]),
      check('partial', 10)
    );
    expect(combat.playerDamage).toBe(3); // ceil(6 / 2)
    expect(combat.updatedEntities[0]?.hp).toBe(15);
  });

  it('misses on a failed check but still takes the foe counterattack', () => {
    const combat = fight(makeState([foe('Lurker', 18, 3)]), check('fail', 3));
    expect(combat.playerDamage).toBe(0);
    expect(combat.updatedEntities[0]?.hp).toBe(18);
    expect(combat.allFoesDead).toBe(false);
    expect(combat.partyDamage).toBe(6); // 3 base + 3 threat
  });

  it('doubles damage on a natural 20', () => {
    const combat = fight(
      makeState([foe('Lurker', 18, 3)]),
      check('success', 20)
    );
    expect(combat.playerDamage).toBe(12); // (5 + 1) * 2
    expect(combat.updatedEntities[0]?.hp).toBe(6);
  });

  it('fells the last foe and clears the board, ending the counterattack', () => {
    const combat = fight(makeState([foe('Runt', 5, 3)]), check('success', 15));
    expect(combat.targetSlain).toBe(true);
    expect(combat.allFoesDead).toBe(true);
    expect(combat.updatedEntities[0]?.hp).toBe(0);
    expect(combat.partyDamage).toBe(0); // no survivors left to strike
  });

  it('strikes only the first foe, and the survivors all strike back', () => {
    const state = makeState([
      foe('Runt', 5, 2),
      foe('Brute', 20, 4),
      foe('Whelp', 15, 3),
    ]);
    const combat = fight(state, check('success', 15));
    expect(combat.targetName).toBe('Runt');
    expect(combat.targetSlain).toBe(true);
    expect(combat.updatedEntities[1]?.hp).toBe(20); // Brute untouched
    expect(combat.updatedEntities[2]?.hp).toBe(15); // Whelp untouched
    expect(combat.allFoesDead).toBe(false);
    // Brute (3 + 4) + Whelp (3 + 3), depth 0.
    expect(combat.partyDamage).toBe(13);
  });

  it('scales damage and counterattacks with depth', () => {
    const combat = fight(
      makeState([foe('Deep One', 40, 2)], { depth: 6 }),
      check('success', 15)
    );
    expect(combat.playerDamage).toBe(8); // 5 + 1 mod + floor(6 / 3)
    expect(combat.updatedEntities[0]?.hp).toBe(32);
    expect(combat.partyDamage).toBe(6); // 3 base + 2 threat + floor(6 / 4)
  });
});

describe('combatDirective', () => {
  it('describes a wounding blow and the foes striking back', () => {
    const text = combatDirective(
      fight(makeState([foe('Lurker', 18, 3)]), check('success', 15))
    );
    expect(text).toContain('wounds Lurker');
    expect(text).toContain('strike back');
    expect(text).not.toContain('opens');
  });

  it('describes a killing blow that clears the room', () => {
    const text = combatDirective(
      fight(makeState([foe('Runt', 5, 3)]), check('success', 15))
    );
    expect(text).toContain('fells Runt');
    expect(text).toContain('way onward opens');
  });

  it('describes a miss', () => {
    const text = combatDirective(
      fight(makeState([foe('Lurker', 18, 3)]), check('fail', 3))
    );
    expect(text).toContain('misses Lurker');
  });
});

describe('combatEffects', () => {
  it('banks foe health and the counterattack, paying only on a clear', () => {
    const wound = combatEffects(
      fight(makeState([foe('Brute', 20, 4)]), check('success', 15))
    );
    expect(wound.hpDelta).toBe(-7); // foe survives and strikes back (3 + 4)
    expect(wound.entities?.[0]?.hp).toBe(14);
    expect(wound.resolve).toBe(false);
    expect(wound.reward).toBe(false);

    const kill = combatEffects(
      fight(makeState([foe('Runt', 5, 3)]), check('success', 15))
    );
    expect(kill.hpDelta).toBe(0); // no survivors left to counterattack
    expect(kill.resolve).toBe(true);
    expect(kill.reward).toBe(true);
  });
});