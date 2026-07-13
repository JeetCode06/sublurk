import type { Party, ResolveResult } from '../../shared/game';
import { applyConditions, conditionHpTick } from './conditions';

export type AppliedResult = {
  party: Party;
  died: boolean;
  adjustments: string[];
};

const MAX_HP_DELTA = 25;
const MAX_EMBERS_DELTA = 100;
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

  const embersDelta = clamp(
    result.embersDelta,
    -MAX_EMBERS_DELTA,
    MAX_EMBERS_DELTA
  );
  if (embersDelta !== result.embersDelta) {
    adjustments.push(
      `embersDelta ${result.embersDelta} clamped to ${embersDelta}`
    );
  }

  const conditionDrain = conditionHpTick(party.conditions);
  if (conditionDrain > 0) {
    adjustments.push(`conditions drained ${conditionDrain} hp`);
  }

  const hp = clamp(party.hp + hpDelta - conditionDrain, 0, party.maxHp);
  const embers = Math.max(0, party.embers + embersDelta);

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
    party: { ...party, hp, embers, inventory: inv.items, conditions },
    died: hp <= 0,
    adjustments,
  };
}
