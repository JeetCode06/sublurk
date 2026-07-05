import type { SceneEntity } from '../../shared/game';

// The server-authoritative adjustments to a turn, computed before the narration
// call so the outcome never depends on the model. Combat and rest each produce
// one; applyTurn applies whichever is present, and the narration prompt is
// handed a matching directive so the prose agrees with these numbers.
export type TurnEffects = {
  // Replaces the model's proposed hpDelta — combat damage, or rest healing.
  hpDelta?: number;
  // The scene's entities after the turn, e.g. foe health after an exchange.
  entities?: SceneEntity[];
  // Forces the room to resolve and the party to descend.
  resolve?: boolean;
  // Whether resolving pays embers: true for a challenge overcome, false for a
  // rest, which is a haven rather than a victory.
  reward?: boolean;
};