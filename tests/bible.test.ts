import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WORLD_BIBLE,
  coerceWorldBible,
} from '../src/server/game/bible';
import type { Villain, WorldBible } from '../src/shared/game';

function makeBible(overrides: Partial<WorldBible> = {}): WorldBible {
  return {
    theme: 'A sunken city of coral spires drowned beneath a cursed tide.',
    villain: {
      name: 'the Drowned Cantor',
      motive: 'to sing all the world beneath the waves.',
    },
    heroFlavor: 'a crew of pearl-divers turned reluctant heroes.',
    motifs: ['barnacles', 'green light', 'broken hymns'],
    itemVocabulary: ['a conch horn', 'a salt-iron blade'],
    artStyle: 'eerie undersea painterly, bioluminescent teal',
    finalBossConcept: 'the Drowned Cantor in his cathedral of coral.',
    classNames: {
      warrior: 'Tideguard',
      witch: 'Coral Seer',
      healer: 'Pearl Mender',
      trickster: 'Reef Stalker',
      adventurer: 'Drifter',
    },
    ...overrides,
  };
}

describe('coerceWorldBible', () => {
  it('fills missing class names from the base archetypes', () => {
    const result = coerceWorldBible({ classNames: { warrior: 'Tideguard' } });
    expect(result.classNames.warrior).toBe('Tideguard');
    expect(result.classNames.witch).toBe(DEFAULT_WORLD_BIBLE.classNames.witch);
    expect(result.classNames.adventurer).toBe(
      DEFAULT_WORLD_BIBLE.classNames.adventurer
    );
  });

  it('returns the default bible for an empty object', () => {
    expect(coerceWorldBible({})).toEqual(DEFAULT_WORLD_BIBLE);
  });

  it('passes a fully valid bible through unchanged', () => {
    const bible = makeBible();
    expect(coerceWorldBible(bible)).toEqual(bible);
  });

  it('falls back per-field when a field is missing', () => {
    const result = coerceWorldBible({ theme: 'Just a theme.' });
    expect(result.theme).toBe('Just a theme.');
    expect(result.heroFlavor).toBe(DEFAULT_WORLD_BIBLE.heroFlavor);
    expect(result.villain).toEqual(DEFAULT_WORLD_BIBLE.villain);
  });

  it('falls back when a string field is blank or whitespace', () => {
    const result = coerceWorldBible(makeBible({ theme: '   ' }));
    expect(result.theme).toBe(DEFAULT_WORLD_BIBLE.theme);
  });

  it('falls back when a string field is the wrong type', () => {
    const result = coerceWorldBible(
      makeBible({ artStyle: 42 as unknown as string })
    );
    expect(result.artStyle).toBe(DEFAULT_WORLD_BIBLE.artStyle);
  });

  it('trims surrounding whitespace on valid strings', () => {
    const result = coerceWorldBible(makeBible({ artStyle: '  neon noir  ' }));
    expect(result.artStyle).toBe('neon noir');
  });

  it('fills a partial villain and defaults the missing motive', () => {
    const result = coerceWorldBible(
      makeBible({ villain: { name: 'the Rust Prophet' } as Villain })
    );
    expect(result.villain.name).toBe('the Rust Prophet');
    expect(result.villain.motive).toBe(DEFAULT_WORLD_BIBLE.villain.motive);
  });

  it('defaults the whole villain when it is not an object', () => {
    const result = coerceWorldBible(
      makeBible({ villain: 'nope' as unknown as Villain })
    );
    expect(result.villain).toEqual(DEFAULT_WORLD_BIBLE.villain);
  });

  it('filters non-string and empty motif entries', () => {
    const result = coerceWorldBible(
      makeBible({
        motifs: ['ash', '', 7, '  ', 'embers'] as unknown as string[],
      })
    );
    expect(result.motifs).toEqual(['ash', 'embers']);
  });

  it('de-duplicates list entries', () => {
    const result = coerceWorldBible(
      makeBible({ motifs: ['fog', 'fog', 'mist'] })
    );
    expect(result.motifs).toEqual(['fog', 'mist']);
  });

  it('caps motifs at the maximum', () => {
    const many = Array.from({ length: 20 }, (_, i) => `motif-${i}`);
    const result = coerceWorldBible(makeBible({ motifs: many }));
    expect(result.motifs).toHaveLength(8);
    expect(result.motifs[0]).toBe('motif-0');
  });

  it('falls back to default motifs when the list has no usable entries', () => {
    const result = coerceWorldBible(
      makeBible({ motifs: ['', '  '] as string[] })
    );
    expect(result.motifs).toEqual(DEFAULT_WORLD_BIBLE.motifs);
  });

  it('returns the default bible for non-object input', () => {
    expect(coerceWorldBible(null)).toEqual(DEFAULT_WORLD_BIBLE);
    expect(coerceWorldBible('a string')).toEqual(DEFAULT_WORLD_BIBLE);
    expect(coerceWorldBible(42)).toEqual(DEFAULT_WORLD_BIBLE);
  });
});