import { describe, it, expect } from 'vitest';
import {
  DC_BY_BAND,
  dcForBand,
  bandForRoom,
  bandForDC,
} from '../src/server/game/difficulty';

describe('dcForBand', () => {
  it('maps bands to the SRD ladder values', () => {
    expect(dcForBand('trivial')).toBe(5);
    expect(dcForBand('medium')).toBe(15);
    expect(dcForBand('hard')).toBe(20);
    expect(dcForBand('formidable')).toBe(30);
    expect(DC_BY_BAND.very_hard).toBe(25);
  });
});

describe('bandForRoom', () => {
  it('uses a base band per room type at the surface', () => {
    expect(bandForRoom('rest', 0)).toBe('trivial');
    expect(bandForRoom('npc', 0)).toBe('easy');
    expect(bandForRoom('combat', 0)).toBe('easy');
    expect(bandForRoom('boss', 0)).toBe('hard');
  });

  it('raises the band as the party goes deeper', () => {
    expect(bandForRoom('combat', 8)).toBe('hard'); // easy + 2 steps
  });

  it('caps at the hardest band', () => {
    expect(bandForRoom('boss', 99)).toBe('hard');
  });
});

describe('bandForDC', () => {
  it('finds the nearest band for a DC', () => {
    expect(bandForDC(15)).toBe('medium');
    expect(bandForDC(20)).toBe('hard');
    expect(bandForDC(12)).toBe('easy'); // closer to 10 than 15
    expect(bandForDC(100)).toBe('formidable');
  });
});
