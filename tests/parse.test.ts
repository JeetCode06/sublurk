import { describe, it, expect } from 'vitest';
import {
  parseResolveResult,
  parseRoomScene,
  FALLBACK_SCENE,
} from '../src/server/ai/parse';

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

describe('parseRoomScene', () => {
  it('parses a clean scene reply', () => {
    const raw = JSON.stringify({ scene: 'A vaulted hall drips with cold.' });
    expect(parseRoomScene(raw)).toBe('A vaulted hall drips with cold.');
  });

  it('falls back when the scene is missing or empty', () => {
    expect(parseRoomScene('{}')).toBe(FALLBACK_SCENE);
    expect(parseRoomScene(JSON.stringify({ scene: '   ' }))).toBe(
      FALLBACK_SCENE
    );
  });

  it('falls back on unparseable replies', () => {
    expect(parseRoomScene('the model said no json')).toBe(FALLBACK_SCENE);
  });
});