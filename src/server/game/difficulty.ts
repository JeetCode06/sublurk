import type { RoomType } from '../../shared/game';

export type DifficultyBand =
  | 'trivial'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'very_hard'
  | 'formidable';

const BANDS_ASCENDING: DifficultyBand[] = [
  'trivial',
  'easy',
  'medium',
  'hard',
  'very_hard',
  'formidable',
];

// The SRD difficulty-class ladder. Every room difficulty is one of these, so the
// numbers are calibrated instead of arbitrary.
export const DC_BY_BAND: Record<DifficultyBand, number> = {
  trivial: 5,
  easy: 10,
  medium: 15,
  hard: 20,
  very_hard: 25,
  formidable: 30,
};

export const BAND_LABELS: Record<DifficultyBand, string> = {
  trivial: 'Trivial',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  very_hard: 'Very Hard',
  formidable: 'Formidable',
};

// Base challenge per room type, before depth scaling.
const BASE_BAND: Record<RoomType, DifficultyBand> = {
  rest: 'trivial',
  shop: 'easy',
  treasure: 'easy',
  npc: 'easy',
  combat: 'easy',
  puzzle: 'easy',
  trap: 'easy',
  boss: 'hard',
};

const DEPTH_PER_STEP = 4;

export function dcForBand(band: DifficultyBand): number {
  return DC_BY_BAND[band];
}

function shiftBand(band: DifficultyBand, steps: number): DifficultyBand {
  const index = BANDS_ASCENDING.indexOf(band);
  const next = Math.max(0, Math.min(BANDS_ASCENDING.length - 1, index + steps));
  return BANDS_ASCENDING[next]!;
}

// The next harder band, capped at the top — used to set the final boss a notch
// above the ordinary bosses of the run.
export function nextBand(band: DifficultyBand): DifficultyBand {
  return shiftBand(band, 1);
}

// Difficulty never rises past this. A party's best possible total is about 23
// (a 20 on the die plus a +3 modifier), so a DC above ~20 would make even a
// great roll deal nothing on a check — turning fights into a natural-20 lottery
// rather than merely hard. Depth still ramps rooms up to this ceiling.
const MAX_BAND: DifficultyBand = 'hard';

function capBand(band: DifficultyBand): DifficultyBand {
  const cap = BANDS_ASCENDING.indexOf(MAX_BAND);
  const idx = BANDS_ASCENDING.indexOf(band);
  return BANDS_ASCENDING[Math.min(idx, cap)]!;
}

// A room's difficulty band: its base challenge raised by how deep the party is,
// never past the ceiling above.
export function bandForRoom(roomType: RoomType, depth: number): DifficultyBand {
  return capBand(
    shiftBand(BASE_BAND[roomType], Math.floor(depth / DEPTH_PER_STEP))
  );
}

// The nearest band for a given DC, for display and for telling the AI the stakes
// in named terms.
export function bandForDC(dc: number): DifficultyBand {
  let closest: DifficultyBand = BANDS_ASCENDING[0]!;
  let bestGap = Infinity;
  for (const band of BANDS_ASCENDING) {
    const gap = Math.abs(DC_BY_BAND[band] - dc);
    if (gap < bestGap) {
      bestGap = gap;
      closest = band;
    }
  }
  return closest;
}