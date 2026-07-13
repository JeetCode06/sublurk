import type { AbilityCheck, GameState, Outcome } from '../../shared/game';
import type { TurnEffects } from './effects';

// A rest restores a percentage of the party's maximum health, scaled by how well
// the rest went — even a poor one returns a little. Integer percentages keep the
// math exact; the gain is still bounded by the per-turn HP clamp in
// applyResolveResult, so no single rest is a full heal.
const REST_PERCENT: Record<Outcome, number> = {
  success: 45,
  partial: 28,
  fail: 10,
};

export type RestResult = { heal: number; deep: boolean };

function healFor(outcome: Outcome, maxHp: number): number {
  return Math.ceil((maxHp * REST_PERCENT[outcome]) / 100);
}

// Resolves a turn spent in a rest room: the party recovers health and then moves
// on. Returns null anywhere else, so only rest rooms heal and everything else
// falls through to the ordinary turn flow.
export function resolveRest(
  state: GameState,
  check: AbilityCheck
): RestResult | null {
  if (state.room.type !== 'rest') return null;
  return {
    heal: healFor(check.outcome, state.party.maxHp),
    deep: check.outcome !== 'fail',
  };
}

// Resting recovers health and ends the room, but earns no embers — a haven is a
// respite, not a challenge overcome.
export function restEffects(rest: RestResult): TurnEffects {
  return { hpDelta: rest.heal, resolve: true, reward: false };
}

// Tells the narrator to keep the beat safe and restorative and to match how well
// the rest actually went; no new threat may appear in a haven.
export function restDirective(rest: RestResult): string {
  const quality = rest.deep
    ? 'The party finds a real moment of respite and recovers meaningfully'
    : 'The party manages only a fitful, uneasy rest, but recovers a little';
  return `REST RESULT (narrate exactly this restful beat and nothing more — introduce no new threat, foe, or harm): ${quality} before pressing on.`;
}
