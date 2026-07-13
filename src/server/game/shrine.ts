import type { GameState } from '../../shared/game';
import type { TurnEffects } from './effects';

// A shrine trades embers for healing. It lives in shop rooms and is the first
// real sink for the currency: the offer is surfaced as a suggestion the player
// taps (or types), the exchange is resolved server-side, and the narrator only
// describes it. Deterministic, so spending never depends on the model.

const SHRINE_BASE_COST = 12;
const SHRINE_COST_PER_DEPTH = 2;

export type ShrineOffer = { cost: number; label: string };
export type ShrineResult = { cost: number; heal: number };

// Deeper shrines ask more, so healing stays a real cost as the party grows rich.
function shrineCost(depth: number): number {
  return SHRINE_BASE_COST + depth * SHRINE_COST_PER_DEPTH;
}

// A restorative offering returns half the party's maximum health. The actual
// gain is still bounded by the per-turn HP clamp in applyResolveResult.
function shrineHeal(maxHp: number): number {
  return Math.ceil(maxHp / 2);
}

// The offer available right now, or null when there is nothing to sell: outside a
// shop, at full health, or when the party cannot afford it. The label is the
// exact text shown as a suggestion.
export function shrineOffer(state: GameState): ShrineOffer | null {
  if (state.room.type !== 'shop') return null;
  if (state.party.hp >= state.party.maxHp) return null;
  const cost = shrineCost(state.party.depth);
  if (state.party.embers < cost) return null;
  return { cost, label: `Offer ${cost} embers to heal` };
}

// Whether an action reads as making an offering, so tapping the suggestion and
// typing something equivalent both work while ordinary actions do not.
function isOfferingAction(action: string): boolean {
  const text = action.toLowerCase();
  const offers = /\b(offer|give|pay|pray|donate|tribute)\b/.test(text);
  const currency = /\b(ember|embers|shrine|altar|offering)\b/.test(text);
  return offers && currency;
}

// Resolves an offering: null unless there is a live offer and the action is an
// offering, otherwise the cost paid and the health restored.
export function resolveShrine(
  state: GameState,
  action: string
): ShrineResult | null {
  const offer = shrineOffer(state);
  if (!offer) return null;
  if (!isOfferingAction(action)) return null;
  return { cost: offer.cost, heal: shrineHeal(state.party.maxHp) };
}

// Spend the embers, restore the health, and end the room. No embers are earned —
// they are spent — so this never pays a reward.
export function shrineEffects(shrine: ShrineResult): TurnEffects {
  return {
    hpDelta: shrine.heal,
    embersDelta: -shrine.cost,
    resolve: true,
    reward: false,
  };
}

// Tells the narrator exactly what the offering did, so the prose matches the
// mechanics and invents no new danger.
export function shrineDirective(shrine: ShrineResult): string {
  return `OFFERING RESULT (narrate exactly this and nothing more — introduce no new threat, foe, or harm): The party offers ${shrine.cost} embers and is bathed in restoring light, recovering their strength before pressing on.`;
}

// Surfaces the current offer as the first suggestion in a shop room, recomputed
// for the party's live embers and health. Display-only and idempotent, so it can
// run on every response without stacking duplicates.
export function withShrineOffer(state: GameState): GameState {
  const offer = shrineOffer(state);
  if (!offer) return state;
  if (state.room.suggestions.includes(offer.label)) return state;
  return {
    ...state,
    room: {
      ...state.room,
      suggestions: [offer.label, ...state.room.suggestions],
    },
  };
}
