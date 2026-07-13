import { describe, it, expect } from 'vitest';
import { SOLO_WORLD_BIBLE, SOLO_MAP } from '../src/server/soloworld';
import { CLASS_IDS } from '../src/shared/classes';

describe('fixed solo world', () => {
  it('names the same final boss as its map', () => {
    expect(SOLO_WORLD_BIBLE.villain.name).toBe(SOLO_MAP.finalBoss.name);
  });

  it('has a themed name for every class', () => {
    for (const id of CLASS_IDS) {
      expect(SOLO_WORLD_BIBLE.classNames[id]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('descends to the Hollow King', () => {
    expect(SOLO_MAP.nodes.length).toBeGreaterThanOrEqual(3);
    expect(SOLO_MAP.nodes.at(-1)?.villain?.name).toBe('the Hollow King');
  });
});
