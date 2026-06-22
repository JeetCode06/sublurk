import type { Party, ResolveResult } from '../../shared/game';
import { applyConditions } from './conditions';

export type AppliedResult = {
  party: Party;
  died: boolean;
  adjustments: string[];
};

const MAX_HP_DELTA = 25;
const MAX_GOLD_DELTA = 100;
const MAX_INVENTORY = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyInventory(
  current: string[],
  add: string[],
  remove: string[]
): { items: string[]; notes: string[] } {
  const items = [...current];
  const notes: string[] = [];

  for (const item of remove) {
    const index = items.indexOf(item);
    if (index === -1) {
      notes.push(`tried to remove missing item: ${item}`);
    } else {
      items.splice(index, 1);
    }
  }

  for (const item of add) {
    if (items.length >= MAX_INVENTORY) {
      notes.push(`inventory full; dropped: ${item}`);
    } else {
      items.push(item);
    }
  }

  return { items, notes };
}

// Forces the AI's proposed outcome into legal bounds before it is applied.
// The AI proposes; the server decides. Death is derived from HP, never taken from the AI.
export function applyResolveResult(
  party: Party,
  result: ResolveResult
): AppliedResult {
  const adjustments: string[] = [];

  const hpDelta = clamp(result.hpDelta, -MAX_HP_DELTA, MAX_HP_DELTA);
  if (hpDelta !== result.hpDelta) {
    adjustments.push(`hpDelta ${result.hpDelta} clamped to ${hpDelta}`);
  }

  const goldDelta = clamp(result.goldDelta, -MAX_GOLD_DELTA, MAX_GOLD_DELTA);
  if (goldDelta !== result.goldDelta) {
    adjustments.push(`goldDelta ${result.goldDelta} clamped to ${goldDelta}`);
  }

  const hp = clamp(party.hp + hpDelta, 0, party.maxHp);
  const gold = Math.max(0, party.gold + goldDelta);

  const inv = applyInventory(
    party.inventory,
    result.inventoryAdd,
    result.inventoryRemove
  );
  adjustments.push(...inv.notes);

  const conditions = applyConditions(
    party.conditions,
    result.statusAdd,
    result.statusRemove
  );

  return {
    party: { ...party, hp, gold, inventory: inv.items, conditions },
    died: hp <= 0,
    adjustments,
  };
}