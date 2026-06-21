import type {
  AbilityCheck,
  AbilityId,
  Advantage,
  Outcome,
} from '../../shared/game';
import { abilityModifier } from './abilities';

export type DiceRoll = {
  die: number;
  modifier: number;
  total: number;
  difficulty: number;
  outcome: Outcome;
};

export type RandFn = () => number;

const DIE_SIDES = 20;
const PARTIAL_BAND = 4;

// Resolves a d20 result into an outcome. A natural 1 always fails and a natural
// 20 always succeeds, ignoring modifiers; otherwise a near miss is a partial.
function outcomeFor(die: number, total: number, difficulty: number): Outcome {
  if (die === 1) return 'fail';
  if (die === DIE_SIDES) return 'success';
  const margin = total - difficulty;
  if (margin >= 0) return 'success';
  if (margin >= -PARTIAL_BAND) return 'partial';
  return 'fail';
}

function rollDie(rand: RandFn): number {
  return 1 + Math.floor(rand() * DIE_SIDES);
}

export function rollAction(
  difficulty: number,
  modifier: number,
  rand: RandFn = Math.random
): DiceRoll {
  const die = rollDie(rand);
  const total = die + modifier;
  return {
    die,
    modifier,
    total,
    difficulty,
    outcome: outcomeFor(die, total, difficulty),
  };
}

// A full ability check: rolls a d20 (two, keeping the better or worse for
// advantage or disadvantage), adds the ability's modifier, and resolves against
// the difficulty. The chosen die is what the natural 1/20 rules apply to.
export function rollCheck(
  ability: AbilityId,
  score: number,
  difficulty: number,
  advantage: Advantage,
  rand: RandFn = Math.random
): AbilityCheck {
  const a = rollDie(rand);
  const b = advantage === 'normal' ? a : rollDie(rand);
  const rolls = advantage === 'normal' ? [a] : [a, b];
  const die =
    advantage === 'advantage'
      ? Math.max(a, b)
      : advantage === 'disadvantage'
        ? Math.min(a, b)
        : a;
  const modifier = abilityModifier(score);
  const total = die + modifier;
  return {
    ability,
    advantage,
    rolls,
    die,
    modifier,
    total,
    difficulty,
    outcome: outcomeFor(die, total, difficulty),
  };
}