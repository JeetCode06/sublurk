import { describe, it, expect } from 'vitest';
import {
  buildGeminiRequest,
  readGeminiText,
} from '../src/server/ai/gemini-format';

describe('buildGeminiRequest', () => {
  it('nests the system and user prompts in the Gemini shape', () => {
    const req = buildGeminiRequest('SYSTEM', 'USER');
    expect(req.systemInstruction.parts[0].text).toBe('SYSTEM');
    expect(req.contents[0].parts[0].text).toBe('USER');
    expect(req.contents[0].role).toBe('user');
  });

  it('requests JSON output', () => {
    expect(buildGeminiRequest('s', 'u').generationConfig.responseMimeType).toBe(
      'application/json'
    );
  });
});

describe('readGeminiText', () => {
  it('extracts the text from a normal response', () => {
    const data = {
      candidates: [{ content: { parts: [{ text: '{"narration":"hi"}' }] } }],
    };
    expect(readGeminiText(data)).toBe('{"narration":"hi"}');
  });

  it('joins multiple parts', () => {
    const data = {
      candidates: [{ content: { parts: [{ text: 'a' }, { text: 'b' }] } }],
    };
    expect(readGeminiText(data)).toBe('ab');
  });

  it('returns empty string when there are no candidates', () => {
    expect(readGeminiText({ candidates: [] })).toBe('');
    expect(readGeminiText({})).toBe('');
  });

  it('returns empty string for a non-object', () => {
    expect(readGeminiText(null)).toBe('');
    expect(readGeminiText('nope')).toBe('');
  });

  it('returns empty string when parts are missing', () => {
    expect(readGeminiText({ candidates: [{ content: {} }] })).toBe('');
  });
});