import { describe, it, expect } from 'vitest';
import { buildTurnPrompt, SYSTEM_PROMPT } from '../src/server/ai/prompt';
import { createInitialState } from '../src/server/game/state';
import type { DiceRoll } from '../src/server/game/dice';

const state = createInitialState({
  postId: 't3_abc',
  subredditName: 'r/witchcraft',
  classId: 'witch',
  theme: 'mossy catacombs',
});

const roll: DiceRoll = {
  die: 14,
  modifier: 3,
  total: 17,
  difficulty: 12,
  outcome: 'success',
};

describe('SYSTEM_PROMPT', () => {
  it('specifies the JSON output contract', () => {
    expect(SYSTEM_PROMPT).toContain('narration');
    expect(SYSTEM_PROMPT).toContain('hpDelta');
  });
});

describe('buildTurnPrompt', () => {
  it('includes the chosen action', () => {
    expect(buildTurnPrompt(state, 'light a torch', roll)).toContain(
      'light a torch'
    );
  });

  it('tells the AI the dice outcome so it narrates consistently', () => {
    expect(buildTurnPrompt(state, 'attack', roll)).toContain('success');
  });

  it('includes the party hp, class, and theme', () => {
    const prompt = buildTurnPrompt(state, 'attack', roll);
    expect(prompt).toContain('mossy catacombs');
    expect(prompt).toContain('witch');
    expect(prompt).toContain('50/50');
  });

  it('handles an empty inventory gracefully', () => {
    expect(buildTurnPrompt(state, 'attack', roll)).toContain('empty');
  });

  it('marks the first move when there is no history', () => {
    expect(buildTurnPrompt(state, 'attack', roll)).toContain('first move');
  });
});