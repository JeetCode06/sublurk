import type { AbilityCheck, GameState, SceneEntity } from '../../shared/game';
import { abilityModifier, combatAbility } from './abilities';
import type { TurnEffects } from './effects';

// The mechanical result of one combat exchange, decided entirely server-side so
// a fight never depends on the model. The narration prompt is handed a matching
// directive so the prose agrees with these numbers, and applyTurn applies them.
export type CombatResult = {
  updatedEntities: SceneEntity[];
  playerDamage: number;
  targetName: string | null;
  targetSlain: boolean;
  allFoesDead: boolean;
  partyDamage: number;
};

// A hit's floor before ability and depth; partial hits do half and a natural 20
// doubles. Kept low so a fight is a few exchanges, not one swing.
const BASE_PLAYER_DAMAGE = 5;
// A glancing blow on a non-critical miss. Small, but enough that attrition never
// stalls to zero against a tough foe.
const GRAZE_DAMAGE = 3;
// A foe's base bite before its threat and depth. Modest, so combat is
// attritional against the party's larger pool rather than a coin-flip death.
const BASE_FOE_ATTACK = 3;

function isCombatRoom(state: GameState): boolean {
  return state.room.type === 'combat' || state.room.type === 'boss';
}

function livingFoes(entities: readonly SceneEntity[]): SceneEntity[] {
  return entities.filter(
    (entity) => entity.kind === 'foe' && (entity.hp ?? 0) > 0
  );
}

// Damage the party's blow deals, from the check outcome and their better combat
// ability. A miss deals nothing, a partial lands for half, and a natural 20
// bites twice as deep.
function playerDamageFor(
  check: AbilityCheck,
  combatMod: number,
  depth: number
): number {
  const base =
    BASE_PLAYER_DAMAGE + Math.max(0, combatMod) + Math.floor(depth / 3);
  // A miss still grazes for a little, so a long fight always inches forward and
  // a high-difficulty boss can't become mathematically unwinnable. A natural 1
  // is a true whiff and does nothing.
  if (check.outcome === 'fail') return check.die === 1 ? 0 : GRAZE_DAMAGE;
  const scaled = check.outcome === 'partial' ? Math.ceil(base / 2) : base;
  return check.die === 20 ? scaled * 2 : scaled;
}

// A single foe's counterattack, scaled by how dangerous it looks and how deep
// the party has descended.
function foeAttackFor(foe: SceneEntity, depth: number): number {
  const threat = foe.threat ?? 1;
  return BASE_FOE_ATTACK + threat + Math.floor(depth / 4);
}

// Resolves one exchange for a combat or boss room: the party strikes the nearest
// living foe, and any foe left standing strikes back. Returns null when there is
// nothing to fight, so non-combat rooms and already-cleared boards fall through
// to the ordinary turn flow untouched.
export function resolveCombat(
  state: GameState,
  check: AbilityCheck
): CombatResult | null {
  if (!isCombatRoom(state)) return null;
  const foes = livingFoes(state.room.entities);
  const [target] = foes;
  if (!target) return null;

  const combatMod = abilityModifier(
    state.party.abilities[combatAbility(state.party.abilities)]
  );
  const damage = playerDamageFor(check, combatMod, state.party.depth);
  const targetHp = Math.max(0, (target.hp ?? 0) - damage);

  const updatedEntities = state.room.entities.map((entity) =>
    entity === target ? { ...entity, hp: targetHp } : entity
  );
  const survivors = livingFoes(updatedEntities);
  const partyDamage = survivors.reduce(
    (sum, foe) => sum + foeAttackFor(foe, state.party.depth),
    0
  );

  return {
    updatedEntities,
    playerDamage: damage,
    targetName: target.name,
    targetSlain: targetHp === 0,
    allFoesDead: survivors.length === 0,
    partyDamage,
  };
}

// The authoritative account of the exchange, handed to the narration prompt so
// the prose matches the mechanics exactly — no invented wounds, no premature
// deaths, no foe surviving a killing blow in the fiction.
export function combatDirective(combat: CombatResult): string {
  const target = combat.targetName ?? 'the enemy';
  const beats: string[] = [];
  if (combat.playerDamage <= 0) {
    beats.push(`The party's attack misses ${target}.`);
  } else if (combat.targetSlain) {
    beats.push(`The party's attack fells ${target}.`);
  } else {
    beats.push(`The party's attack wounds ${target}, but it still stands.`);
  }
  if (combat.allFoesDead) {
    beats.push('Every foe is down; the way onward opens.');
  } else if (combat.partyDamage > 0) {
    beats.push('The surviving foes strike back, wounding the party.');
  }
  return `COMBAT RESULT (this is exactly what happened — narrate only this; invent no other wounds, deaths, or survivors): ${beats.join(' ')}`;
}

// Translates a resolved exchange into the server-authoritative adjustments
// applyTurn applies: the party takes the counterattack, the wounded foes are
// banked, and clearing the board — and only that — pays embers.
export function combatEffects(combat: CombatResult): TurnEffects {
  return {
    // With every foe down there is no counterattack; guarding this also avoids a
    // negative zero from negating zero damage.
    hpDelta: combat.allFoesDead ? 0 : -combat.partyDamage,
    entities: combat.updatedEntities,
    resolve: combat.allFoesDead,
    reward: combat.allFoesDead,
  };
}
