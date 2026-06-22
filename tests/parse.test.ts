import { describe, it, expect } from 'vitest';
import {
  parseResolveResult,
  parseScene,
  parseIntro,
  parseWorldBible,
  parseMap,
  FALLBACK_SCENE,
} from '../src/server/ai/parse';
import { DEFAULT_WORLD_BIBLE } from '../src/server/game/bible';
import { DEFAULT_MAP } from '../src/server/game/map';

const valid = JSON.stringify({
  narration: 'The torch flares to life.',
  outcome: 'success',
  hpDelta: -3,
  goldDelta: 10,
  inventoryAdd: ['torch'],
  inventoryRemove: [],
  statusAdd: ['lit'],
  statusRemove: ['blinded'],
  roomResolved: true,
  nextRoomHint: 'a damp corridor',
  death: false,
});

describe('parseResolveResult', () => {
  it('parses a clean JSON reply', () => {
    const result = parseResolveResult(valid);
    expect(result.narration).toBe('The torch flares to life.');
    expect(result.outcome).toBe('success');
    expect(result.hpDelta).toBe(-3);
    expect(result.inventoryAdd).toEqual(['torch']);
    expect(result.roomResolved).toBe(true);
    expect(result.nextRoomHint).toBe('a damp corridor');
  });

  it('strips markdown code fences', () => {
    const fenced = '```json\n' + valid + '\n```';
    expect(parseResolveResult(fenced).outcome).toBe('success');
  });

  it('ignores prose before and after the JSON', () => {
    const messy = 'Sure! Here is the result:\n' + valid + '\nHope that helps.';
    expect(parseResolveResult(messy).hpDelta).toBe(-3);
  });

  it('fills missing fields with safe defaults', () => {
    const result = parseResolveResult('{}');
    expect(result.hpDelta).toBe(0);
    expect(result.goldDelta).toBe(0);
    expect(result.inventoryAdd).toEqual([]);
    expect(result.roomResolved).toBe(false);
    expect(result.death).toBe(false);
    expect(result.nextRoomHint).toBeNull();
  });

  it('coerces wrong-typed fields to defaults', () => {
    const result = parseResolveResult(
      '{"hpDelta":"lots","inventoryAdd":"sword","roomResolved":"yes"}'
    );
    expect(result.hpDelta).toBe(0);
    expect(result.inventoryAdd).toEqual([]);
    expect(result.roomResolved).toBe(false);
  });

  it('drops non-string items from arrays', () => {
    const result = parseResolveResult(
      '{"inventoryAdd":["sword",5,null,"shield"]}'
    );
    expect(result.inventoryAdd).toEqual(['sword', 'shield']);
  });

  it('defaults an invalid outcome to partial', () => {
    expect(parseResolveResult('{"outcome":"critical"}').outcome).toBe(
      'partial'
    );
  });

  it('returns a safe fizzle when there is no JSON at all', () => {
    const result = parseResolveResult('the model said something weird');
    expect(result.roomResolved).toBe(false);
    expect(result.hpDelta).toBe(0);
    expect(result.narration.length).toBeGreaterThan(0);
  });

  it('returns a safe fizzle on malformed JSON', () => {
    const result = parseResolveResult('{"hpDelta": 3, ');
    expect(result.roomResolved).toBe(false);
    expect(result.hpDelta).toBe(0);
  });
});

describe('parseScene', () => {
  it('parses a clean structured scene', () => {
    const raw = JSON.stringify({
      description: 'A vaulted hall drips with cold.',
      entities: [
        {
          kind: 'foe',
          name: 'Cave Lurker',
          blurb: 'eyes in the dark',
          threat: 3,
          hp: 18,
        },
        { kind: 'object', name: 'Iron Chest', blurb: 'rusted shut' },
      ],
      threats: ['dripping ceiling'],
    });
    const scene = parseScene(raw);
    expect(scene.description).toBe('A vaulted hall drips with cold.');
    expect(scene.entities).toHaveLength(2);
    expect(scene.entities[0]).toEqual({
      kind: 'foe',
      name: 'Cave Lurker',
      blurb: 'eyes in the dark',
      threat: 3,
      hp: 18,
    });
    expect(scene.threats).toEqual(['dripping ceiling']);
  });

  it('drops entities with an invalid kind or empty name', () => {
    const raw = JSON.stringify({
      description: 'A room.',
      entities: [
        { kind: 'dragon', name: 'Wyrm' },
        { kind: 'npc', name: '   ' },
        { kind: 'npc', name: 'Hooded Stranger', blurb: 'waits quietly' },
      ],
      threats: [],
    });
    const scene = parseScene(raw);
    expect(scene.entities).toHaveLength(1);
    expect(scene.entities[0]?.name).toBe('Hooded Stranger');
  });

  it('keeps threat and hp only for foes and clamps them', () => {
    const raw = JSON.stringify({
      description: 'A lair.',
      entities: [
        { kind: 'foe', name: 'Titan', threat: 99, hp: 9999 },
        { kind: 'object', name: 'Lever', threat: 4, hp: 10 },
      ],
      threats: [],
    });
    const scene = parseScene(raw);
    expect(scene.entities[0]).toEqual({
      kind: 'foe',
      name: 'Titan',
      blurb: '',
      threat: 5,
      hp: 40,
    });
    expect(scene.entities[1]).toEqual({
      kind: 'object',
      name: 'Lever',
      blurb: '',
    });
  });

  it('caps entities and threats, de-duplicating threats', () => {
    const raw = JSON.stringify({
      description: 'A swarm.',
      entities: Array.from({ length: 9 }, (_, i) => ({
        kind: 'foe',
        name: `Rat ${i}`,
      })),
      threats: ['smoke', 'smoke', 'fire', 'flood', 'chasm'],
    });
    const scene = parseScene(raw);
    expect(scene.entities).toHaveLength(4);
    expect(scene.threats).toEqual(['smoke', 'fire', 'flood']);
  });

  it('falls back to a calm scene when the description is missing', () => {
    const scene = parseScene(JSON.stringify({ entities: [], threats: [] }));
    expect(scene.description).toBe(FALLBACK_SCENE.description);
    expect(scene.entities).toEqual([]);
  });

  it('falls back entirely on unparseable replies', () => {
    expect(parseScene('the model said no json')).toEqual(FALLBACK_SCENE);
    expect(parseScene('{"description": "half')).toEqual(FALLBACK_SCENE);
  });
});

describe('parseWorldBible', () => {
  const validBible = JSON.stringify({
    theme: 'A blighted garden realm where nothing grows but thorns.',
    villain: { name: 'the Pruner', motive: 'to cut back all wild growth.' },
    heroFlavor: 'a circle of botanist-mages',
    motifs: ['thorns', 'spores', 'greenhouses'],
    itemVocabulary: ['a pair of shears', 'a seed of light'],
    artStyle: 'overgrown gothic, deep greens',
    finalBossConcept: 'the Pruner in a cathedral of dead vines.',
  });

  it('parses a clean world-bible reply', () => {
    const bible = parseWorldBible(validBible);
    expect(bible.villain.name).toBe('the Pruner');
    expect(bible.motifs).toContain('spores');
    expect(bible.finalBossConcept).toContain('dead vines');
  });

  it('strips markdown fences and surrounding prose', () => {
    const messy = 'Here is the world:\n```json\n' + validBible + '\n```';
    expect(parseWorldBible(messy).villain.name).toBe('the Pruner');
  });

  it('falls back to the default world on unparseable replies', () => {
    expect(parseWorldBible('the model refused')).toEqual(DEFAULT_WORLD_BIBLE);
  });

  it('falls back to the default world on malformed JSON', () => {
    expect(parseWorldBible('{"theme": "half a worl')).toEqual(
      DEFAULT_WORLD_BIBLE
    );
  });

  it('fills missing fields from the default world', () => {
    const bible = parseWorldBible('{"theme":"Only a theme survives."}');
    expect(bible.theme).toBe('Only a theme survives.');
    expect(bible.villain).toEqual(DEFAULT_WORLD_BIBLE.villain);
    expect(bible.artStyle).toBe(DEFAULT_WORLD_BIBLE.artStyle);
  });
});

describe('parseMap', () => {
  const validMap = JSON.stringify({
    nodes: [
      { name: 'Thornfen Marsh', themeTag: 'a fetid, thorn-choked marsh' },
      {
        name: 'The Withered Orchard',
        themeTag: 'rows of blackened dead trees',
      },
      {
        name: "The Pruner's Greenhouse",
        themeTag: 'a vast glass greenhouse of carnivorous vines',
      },
    ],
    finalBoss: { name: 'the Pruner' },
  });

  it('parses a clean map and defaults ids, cleared, and index', () => {
    const map = parseMap(validMap);
    expect(map.nodes).toHaveLength(3);
    expect(map.nodes[0]?.name).toBe('Thornfen Marsh');
    expect(map.nodes[0]?.id).toBe('node-1');
    expect(map.nodes[0]?.cleared).toBe(false);
    expect(map.currentNodeIndex).toBe(0);
    expect(map.finalBoss).toEqual({ name: 'the Pruner', defeated: false });
  });

  it('strips markdown fences', () => {
    const messy = '```json\n' + validMap + '\n```';
    expect(parseMap(messy).finalBoss.name).toBe('the Pruner');
  });

  it('falls back to the default journey on unparseable replies', () => {
    expect(parseMap('the model refused')).toEqual(DEFAULT_MAP);
  });

  it('falls back to the default journey when too few nodes are usable', () => {
    const tooFew = JSON.stringify({
      nodes: [{ name: 'Only One', themeTag: 'a single room' }],
      finalBoss: { name: 'Boss' },
    });
    expect(parseMap(tooFew)).toEqual(DEFAULT_MAP);
  });
});

describe('parseIntro', () => {
  it('extracts the intro text', () => {
    expect(parseIntro(JSON.stringify({ intro: 'The coven gathers.' }))).toBe(
      'The coven gathers.'
    );
  });

  it('falls back to non-empty text on bad or empty input', () => {
    expect(parseIntro('not json at all').length).toBeGreaterThan(0);
    expect(parseIntro(JSON.stringify({ intro: '' })).length).toBeGreaterThan(0);
  });
});