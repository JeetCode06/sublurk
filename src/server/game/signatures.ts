import type { Party } from '../../shared/game';

// How much a Wizard's curse eases the difficulty of a floor's combat check.
export const CURSE_DIFFICULTY_DROP = 3;

// Short beats appended to a turn's narration so a signature is visible when it
// fires, rather than being a silent stat tweak.
export function killingBlowNote(name: string): string {
  return `The blow should have been the end, but ${name} refuses it and holds on at 1 HP.`;
}

export function rerollNote(name: string): string {
  return `Fate deals ${name} a poor hand, and quick cunning steals a second draw.`;
}

export function curseNote(name: string): string {
  return `${name} brands the foe with a curse, and its menace visibly dims.`;
}

// The Fighter shrugs off one killing blow per run, staying at 1 HP; every other
// class, or a Fighter who has already spent it, still falls. Applied after HP is
// settled but before the death is made final.
export function maybeSurvive(
  party: Party,
  died: boolean
): { party: Party; died: boolean; note: string | null } {
  if (!died) return { party, died, note: null };
  if (party.classId !== 'warrior' || (party.killingBlowUsed ?? false)) {
    return { party, died, note: null };
  }
  return {
    party: { ...party, hp: 1, killingBlowUsed: true },
    died: false,
    note: killingBlowNote(party.name),
  };
}