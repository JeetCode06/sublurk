import type { MapState, WorldBible } from '../shared/game';
import { DEFAULT_MAP } from './game/map';

// The fixed dungeon every solo run descends. Solo is the demo and the hook, so
// it is hand-authored and constant rather than themed off whatever subreddit the
// post happens to live in — that per-subreddit theming is the community lane's
// job. Written to be cohesive with SOLO_MAP: the Hollow King's bone dungeon.
export const SOLO_WORLD_BIBLE: WorldBible = {
  theme:
    'a lightless dungeon of cold stone and fused bone, grown like rot around the bone-crowned thing that rules its depths',
  villain: {
    name: 'the Hollow King',
    motive:
      'to keep every soul the dark swallows, fusing them into the dead that make his throne',
  },
  heroFlavor:
    'a lone soul pulled through the glass and dropped into the dark, with no way back but down',
  motifs: [
    'guttering torchlight',
    'fused bone and rusted armor',
    'cold, wet, breathing stone',
    'doors that only ever open downward',
    'something vast stirring far below',
  ],
  itemVocabulary: [
    'a rust-pitted blade',
    'a guttering torch',
    "a shard of someone else's bone",
    'a tarnished iron key',
    'a vial of black water',
  ],
  artStyle:
    'grim torchlit low-fantasy: wet stone, deep shadow, and the orange bruise of ember light',
  finalBossConcept:
    'the bone-crowned ruler of the dungeon, throned on the fused dead, who must be brought down for the only door out to open',
  classNames: {
    warrior: 'Ironclad',
    witch: 'Ashcaller',
    healer: 'Bonemender',
    trickster: 'Cutpurse',
    adventurer: 'Wanderer',
  },
  intelSeeds: [
    'The dungeon was never built. It grew, the way rot grows, around the thing at the bottom.',
    "Every soul the dark keeps is fused into the Hollow King's throne.",
    'The only door that ever opens is the one leading further down.',
    'Torches gutter because the dark is hungry, and light is something it eats.',
    'No one has climbed back out. The way in runs one direction only.',
  ],
};

// The fixed map for solo runs: the canonical four-location descent to the
// Hollow King. Community runs generate their own map from the subreddit instead.
export const SOLO_MAP: MapState = DEFAULT_MAP;

// The theme label stored on a solo run's state.
export const SOLO_THEME = "the Hollow King's dungeon";