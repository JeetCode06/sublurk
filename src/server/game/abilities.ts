import type { Abilities, AbilityId, RoomType } from '../../shared/game';
import { ABILITY_IDS, abilityModifier } from '../../shared/abilities';

// The ability vocabulary lives in shared/abilities so the client stat displays
// use the same source of truth; re-exported here for the engine's callers.
export { ABILITY_IDS, ABILITY_LABELS } from '../../shared/abilities';
export { abilityModifier };

// Which ability a room's challenge tests — combat is muscle, puzzles are
// intellect, traps are reflexes, social rooms are presence.
const ROOM_ABILITY: Record<RoomType, AbilityId> = {
  combat: 'str',
  boss: 'str',
  puzzle: 'int',
  trap: 'dex',
  treasure: 'wis',
  npc: 'cha',
  shop: 'cha',
  rest: 'con',
};

export function abilityForRoomType(roomType: RoomType): AbilityId {
  return ROOM_ABILITY[roomType];
}

// Combat and boss rooms can be met with muscle or finesse, so a hero fights with
// whichever of Strength or Dexterity serves them better — a Rogue isn't punished
// for not being a bruiser. Ties fall to Strength.
export function combatAbility(abilities: Abilities): AbilityId {
  return abilities.dex > abilities.str ? 'dex' : 'str';
}

// Forces parsed-but-untrusted ability data into a complete set, repairing each
// missing or non-numeric score from the fallback (usually the party's class
// scores). Used when reading an older or partial party from storage.
export function coerceAbilities(raw: unknown, fallback: Abilities): Abilities {
  const source =
    typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)
      : {};
  const out = {} as Abilities;
  for (const id of ABILITY_IDS) {
    const value = source[id];
    out[id] =
      typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback[id];
  }
  return out;
}
