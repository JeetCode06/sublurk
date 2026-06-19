import type { Outcome } from '../../shared/game';

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

export function rollAction(
  difficulty: number,
  modifier: number,
  rand: RandFn = Math.random
): DiceRoll {
  const die = 1 + Math.floor(rand() * DIE_SIDES);
  const total = die + modifier;
  const margin = total - difficulty;

  // A natural 1 always fails and a natural 20 always succeeds, ignoring modifiers.
  let outcome: Outcome;
  if (die === 1) {
    outcome = 'fail';
  } else if (die === DIE_SIDES) {
    outcome = 'success';
  } else if (margin >= 0) {
    outcome = 'success';
  } else if (margin >= -PARTIAL_BAND) {
    outcome = 'partial';
  } else {
    outcome = 'fail';
  }

  return { die, modifier, total, difficulty, outcome };
}