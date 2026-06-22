import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MAP,
  coerceMap,
  freshMap,
  advanceMapForDepth,
  atFinalBoss,
  markBossDefeated,
} from '../src/server/game/map';
import type { MapState } from '../src/shared/game';

function makeMap(overrides: Partial<MapState> = {}): MapState {
  return {
    nodes: [
      { id: 'a', name: 'Marsh', themeTag: 'a fetid marsh', cleared: true },
      {
        id: 'b',
        name: 'Orchard',
        themeTag: 'a withered orchard',
        cleared: false,
      },
      {
        id: 'c',
        name: 'Greenhouse',
        themeTag: 'a glass greenhouse',
        cleared: false,
      },
    ],
    currentNodeIndex: 1,
    finalBoss: { name: 'the Pruner', defeated: false },
    ...overrides,
  };
}

describe('coerceMap', () => {
  it('preserves a valid map including run progress', () => {
    const map = makeMap();
    expect(coerceMap(map)).toEqual(map);
  });

  it('returns the default journey for non-object input', () => {
    expect(coerceMap(null)).toEqual(DEFAULT_MAP);
    expect(coerceMap('nope')).toEqual(DEFAULT_MAP);
  });

  it('falls back to the default when there are too few usable nodes', () => {
    expect(coerceMap(makeMap({ nodes: [] }))).toEqual(DEFAULT_MAP);
    expect(
      coerceMap(
        makeMap({
          nodes: [
            {
              id: 'x',
              name: 'Lonely',
              themeTag: 'a single room',
              cleared: false,
            },
          ],
        })
      )
    ).toEqual(DEFAULT_MAP);
  });

  it('drops nodes missing a name or theme tag', () => {
    const map = coerceMap(
      makeMap({
        nodes: [
          { id: 'a', name: 'Marsh', themeTag: 'a fetid marsh', cleared: false },
          { id: 'b', name: '', themeTag: 'nameless', cleared: false },
          { id: 'c', name: 'Vault', themeTag: '   ', cleared: false },
          {
            id: 'd',
            name: 'Throne',
            themeTag: 'a bone throne',
            cleared: false,
          },
        ],
      })
    );
    expect(map.nodes.map((n) => n.name)).toEqual(['Marsh', 'Throne']);
  });

  it('clamps currentNodeIndex into range', () => {
    expect(coerceMap(makeMap({ currentNodeIndex: 99 })).currentNodeIndex).toBe(
      2
    );
    expect(coerceMap(makeMap({ currentNodeIndex: -5 })).currentNodeIndex).toBe(
      0
    );
  });

  it('defaults a missing node id and cleared flag', () => {
    const map = coerceMap({
      nodes: [
        { name: 'One', themeTag: 'first' },
        { name: 'Two', themeTag: 'second' },
      ],
      currentNodeIndex: 0,
      finalBoss: { name: 'Boss' },
    });
    expect(map.nodes[0]?.id).toBe('node-1');
    expect(map.nodes[1]?.id).toBe('node-2');
    expect(map.nodes[0]?.cleared).toBe(false);
    expect(map.finalBoss.defeated).toBe(false);
  });
});

describe('freshMap', () => {
  it('resets progress for a new run while keeping the journey', () => {
    const fresh = freshMap(makeMap({ currentNodeIndex: 2 }));
    expect(fresh.currentNodeIndex).toBe(0);
    expect(fresh.nodes.every((n) => !n.cleared)).toBe(true);
    expect(fresh.finalBoss.defeated).toBe(false);
    expect(fresh.nodes.map((n) => n.name)).toEqual([
      'Marsh',
      'Orchard',
      'Greenhouse',
    ]);
    expect(fresh.finalBoss.name).toBe('the Pruner');
  });

  it('does not share node objects with the template', () => {
    const template = makeMap({
      nodes: [
        { id: 'a', name: 'Marsh', themeTag: 'a fetid marsh', cleared: false },
        {
          id: 'b',
          name: 'Orchard',
          themeTag: 'a dead orchard',
          cleared: false,
        },
      ],
    });
    const fresh = freshMap(template);
    fresh.nodes.forEach((node) => {
      node.cleared = true;
    });
    expect(template.nodes[0]?.cleared).toBe(false);
  });
});

describe('advanceMapForDepth', () => {
  it('keeps the party at the first node within the opening rooms', () => {
    expect(advanceMapForDepth(makeMap(), 0).currentNodeIndex).toBe(0);
    expect(advanceMapForDepth(makeMap(), 2).currentNodeIndex).toBe(0);
  });

  it('advances a node every few rooms, marking passed nodes cleared', () => {
    const map = advanceMapForDepth(makeMap(), 3);
    expect(map.currentNodeIndex).toBe(1);
    expect(map.nodes[0]?.cleared).toBe(true);
    expect(map.nodes[1]?.cleared).toBe(false);
  });

  it('holds at the final node once reached, clearing all earlier nodes', () => {
    const map = advanceMapForDepth(makeMap(), 99);
    expect(map.currentNodeIndex).toBe(2);
    expect(map.nodes.map((n) => n.cleared)).toEqual([true, true, false]);
  });

  it('recomputes cleared flags from depth rather than trusting the input', () => {
    // makeMap() starts with node 0 cleared; at depth 0 nothing is cleared yet.
    expect(
      advanceMapForDepth(makeMap(), 0).nodes.every((n) => !n.cleared)
    ).toBe(true);
  });

  it('preserves the final boss', () => {
    expect(advanceMapForDepth(makeMap(), 3).finalBoss).toEqual({
      name: 'the Pruner',
      defeated: false,
    });
  });
});

describe('atFinalBoss', () => {
  it('is false before the final location', () => {
    expect(atFinalBoss(makeMap({ currentNodeIndex: 0 }))).toBe(false);
    expect(atFinalBoss(makeMap({ currentNodeIndex: 1 }))).toBe(false);
  });

  it('is true at the final location', () => {
    expect(atFinalBoss(makeMap({ currentNodeIndex: 2 }))).toBe(true);
  });
});

describe('markBossDefeated', () => {
  it('marks the boss defeated and every node cleared', () => {
    const map = markBossDefeated(makeMap());
    expect(map.finalBoss.defeated).toBe(true);
    expect(map.nodes.every((n) => n.cleared)).toBe(true);
  });
});