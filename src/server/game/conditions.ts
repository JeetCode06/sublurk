import type { ConditionId } from '../../shared/game';

export const CONDITION_IDS: ConditionId[] = [
  'poisoned',
  'frightened',
  'blinded',
  'restrained',
  'exhausted',
  'charmed',
];

// Each condition makes the party's ability checks roll with disadvantage. The
// summaries double as tooltip text and as the vocabulary handed to the AI.
export const CONDITIONS: Record<
  ConditionId,
  {
    name: string;
    summary: string;
    disadvantageOnChecks: boolean;
    hpTickPerTurn?: number;
  }
> = {
  poisoned: {
    name: 'Poisoned',
    summary: 'Sickened — disadvantage on checks, and it saps health each turn.',
    disadvantageOnChecks: true,
    hpTickPerTurn: 1,
  },
  frightened: {
    name: 'Frightened',
    summary: 'Gripped by fear — disadvantage on checks.',
    disadvantageOnChecks: true,
  },
  blinded: {
    name: 'Blinded',
    summary: 'Cannot see — disadvantage on checks.',
    disadvantageOnChecks: true,
  },
  restrained: {
    name: 'Restrained',
    summary: 'Held fast — disadvantage on checks.',
    disadvantageOnChecks: true,
  },
  exhausted: {
    name: 'Exhausted',
    summary:
      'Worn down — disadvantage on checks, and it wears health away each turn.',
    disadvantageOnChecks: true,
    hpTickPerTurn: 2,
  },
  charmed: {
    name: 'Charmed',
    summary: 'Beguiled — disadvantage on checks.',
    disadvantageOnChecks: true,
  },
};

function isConditionId(value: string): value is ConditionId {
  return (CONDITION_IDS as string[]).includes(value);
}

// Filters untrusted strings (AI output or an older save) down to known condition
// ids, lower-cased and de-duplicated. Unknown words are dropped.
export function coerceConditions(raw: unknown): ConditionId[] {
  if (!Array.isArray(raw)) return [];
  const out: ConditionId[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const id = item.trim().toLowerCase();
    if (isConditionId(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

// Applies the AI's proposed condition changes to the party's current set,
// coercing both sides so only known conditions ever take hold.
export function applyConditions(
  current: ConditionId[],
  add: string[],
  remove: string[]
): ConditionId[] {
  const set = new Set(current);
  for (const id of coerceConditions(remove)) set.delete(id);
  for (const id of coerceConditions(add)) set.add(id);
  return [...set];
}

// True if any active condition makes the party's ability checks harder.
export function checkDisadvantageFrom(conditions: ConditionId[]): boolean {
  return conditions.some((id) => CONDITIONS[id].disadvantageOnChecks);
}

// Total health lost per turn to lingering conditions — the clock that turns a
// persistent bad state into a clean death rather than an endless nag.
export function conditionHpTick(conditions: ConditionId[]): number {
  return conditions.reduce(
    (sum, id) => sum + (CONDITIONS[id].hpTickPerTurn ?? 0),
    0
  );
}
