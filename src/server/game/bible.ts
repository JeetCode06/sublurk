import type { ClassId, WorldBible } from '../../shared/game';
import { BASE_CLASS_NAMES, CLASS_IDS } from '../../shared/classes';
import { asRecord, cleanString, cleanStringList } from '../lib/coerce';

// Caps keep AI-authored lists from bloating prompts and storage; a world only
// needs a handful of recurring motifs and item names to feel coherent.
const MAX_MOTIFS = 8;
const MAX_ITEMS = 12;
const MAX_INTEL = 12;

// A safe, generic fantasy world used whenever a bible can't be generated or the
// AI reply can't be read, so a campaign always has a coherent backdrop to run on.
export const DEFAULT_WORLD_BIBLE: WorldBible = {
  theme:
    'A crumbling underground realm of forgotten halls, where torchlight is the only law and something older stirs in the deep.',
  villain: {
    name: 'the Hollow King',
    motive: 'to drag every living thing down into his silent, endless dark.',
  },
  heroFlavor:
    'a band of unlikely delvers bound by one shared fate, descending together or not at all.',
  motifs: ['guttering torches', 'cold stone', 'distant echoes', 'old bones'],
  itemVocabulary: ['a rusted key', 'a healing draught', 'a cracked relic'],
  artStyle:
    'moody painterly fantasy, deep shadow, warm torchlight, muted earthy palette',
  finalBossConcept:
    'the Hollow King upon his throne of fused bone, where the deepest hall ends.',
  classNames: BASE_CLASS_NAMES,
  intelSeeds: [
    'The deeper halls remember every step taken in them.',
    'They say the Hollow King was once a delver like any other.',
    'No torch has ever stayed lit in the lowest vault.',
    'Some doors here open only for those who have already died once.',
    'The bones set into the walls are said to still be listening.',
    'A second throne lies buried beneath the first.',
  ],
};

function cleanVillain(value: unknown): WorldBible['villain'] {
  const source = asRecord(value);
  return {
    name: cleanString(source.name, DEFAULT_WORLD_BIBLE.villain.name),
    motive: cleanString(source.motive, DEFAULT_WORLD_BIBLE.villain.motive),
  };
}

// Fills a themed name for every class, falling back to the base archetype name
// for any the AI left out, so the roster is always complete.
function cleanClassNames(value: unknown): Record<ClassId, string> {
  const source = asRecord(value);
  const names = {} as Record<ClassId, string>;
  for (const id of CLASS_IDS) {
    names[id] = cleanString(source[id], BASE_CLASS_NAMES[id]);
  }
  return names;
}

// Forces a parsed-but-untrusted bible into a complete, sane WorldBible: every
// field is filled (falling back to the default), strings are trimmed, and the
// flavor lists are de-duplicated and capped. The AI proposes the world; the
// server guarantees it is usable.
export function coerceWorldBible(raw: unknown): WorldBible {
  const source = asRecord(raw);
  return {
    theme: cleanString(source.theme, DEFAULT_WORLD_BIBLE.theme),
    villain: cleanVillain(source.villain),
    heroFlavor: cleanString(source.heroFlavor, DEFAULT_WORLD_BIBLE.heroFlavor),
    motifs: cleanStringList(
      source.motifs,
      DEFAULT_WORLD_BIBLE.motifs,
      MAX_MOTIFS
    ),
    itemVocabulary: cleanStringList(
      source.itemVocabulary,
      DEFAULT_WORLD_BIBLE.itemVocabulary,
      MAX_ITEMS
    ),
    artStyle: cleanString(source.artStyle, DEFAULT_WORLD_BIBLE.artStyle),
    finalBossConcept: cleanString(
      source.finalBossConcept,
      DEFAULT_WORLD_BIBLE.finalBossConcept
    ),
    classNames: cleanClassNames(source.classNames),
    intelSeeds: cleanStringList(
      source.intelSeeds,
      DEFAULT_WORLD_BIBLE.intelSeeds,
      MAX_INTEL
    ),
  };
}
