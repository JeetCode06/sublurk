import { describe, it, expect } from 'vitest';
import {
  buildTurnPrompt,
  SYSTEM_PROMPT,
  buildRoomIntroPrompt,
  ROOM_INTRO_SYSTEM_PROMPT,
  WORLD_BIBLE_SYSTEM_PROMPT,
  buildWorldBiblePrompt,
} from '../src/server/ai/prompt';
import { createInitialState } from '../src/server/game/state';
import type { DiceRoll } from '../src/server/game/dice';
import type { WorldBible } from '../src/shared/game';

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

const bible: WorldBible = {
  theme: 'a sunken cathedral of brine and bone',
  villain: { name: 'the Tidemother', motive: 'to drown the last dry land' },
  heroFlavor: 'a covenant of lantern-bearers',
  motifs: ['salt', 'drowned bells', 'phosphor glow'],
  itemVocabulary: ['a brine-lamp'],
  artStyle: 'sunken gothic',
  finalBossConcept: 'the Tidemother in her flooded nave',
};

describe('SYSTEM_PROMPT', () => {
  it('specifies the JSON output contract', () => {
    expect(SYSTEM_PROMPT).toContain('narration');
    expect(SYSTEM_PROMPT).toContain('hpDelta');
  });
});

describe('buildTurnPrompt', () => {
  it('includes the chosen action', () => {
    expect(buildTurnPrompt(state, 'light a torch', roll, bible)).toContain(
      'light a torch'
    );
  });

  it('tells the AI the dice outcome so it narrates consistently', () => {
    expect(buildTurnPrompt(state, 'attack', roll, bible)).toContain('success');
  });

  it('includes the party hp, class, and world', () => {
    const prompt = buildTurnPrompt(state, 'attack', roll, bible);
    expect(prompt).toContain('sunken cathedral');
    expect(prompt).toContain('witch');
    expect(prompt).toContain('50/50');
  });

  it('injects the world villain and motifs so the campaign stays continuous', () => {
    const prompt = buildTurnPrompt(state, 'attack', roll, bible);
    expect(prompt).toContain('the Tidemother');
    expect(prompt).toContain('phosphor glow');
  });

  it('handles an empty inventory gracefully', () => {
    expect(buildTurnPrompt(state, 'attack', roll, bible)).toContain('empty');
  });

  it('marks the first move when there is no history', () => {
    expect(buildTurnPrompt(state, 'attack', roll, bible)).toContain(
      'first move'
    );
  });
});

describe('ROOM_INTRO_SYSTEM_PROMPT', () => {
  it('asks for the structured scene JSON contract', () => {
    expect(ROOM_INTRO_SYSTEM_PROMPT).toContain('description');
    expect(ROOM_INTRO_SYSTEM_PROMPT).toContain('entities');
    expect(ROOM_INTRO_SYSTEM_PROMPT).toContain('threats');
  });
});

describe('buildRoomIntroPrompt', () => {
  it('includes the room type, world, villain, and class', () => {
    const prompt = buildRoomIntroPrompt(state, bible);
    expect(prompt).toContain('sunken cathedral');
    expect(prompt).toContain('the Tidemother');
    expect(prompt).toContain('witch');
    expect(prompt).toContain(state.room.type);
  });

  it('marks the start of the run when there is no history', () => {
    expect(buildRoomIntroPrompt(state, bible)).toContain('start of the run');
  });
});

describe('WORLD_BIBLE_SYSTEM_PROMPT', () => {
  it('specifies the world-bible JSON contract', () => {
    expect(WORLD_BIBLE_SYSTEM_PROMPT).toContain('villain');
    expect(WORLD_BIBLE_SYSTEM_PROMPT).toContain('finalBossConcept');
  });

  it('forbids referencing Reddit or real people', () => {
    expect(WORLD_BIBLE_SYSTEM_PROMPT).toContain('Reddit');
    expect(WORLD_BIBLE_SYSTEM_PROMPT).toContain('people');
  });
});

describe('buildWorldBiblePrompt', () => {
  const context = {
    name: 'gardening',
    description: 'A place to talk about plants and soil.',
    topPostTitles: ['My tomatoes finally fruited', 'Help, what is this weed?'],
  };

  it('includes the subreddit name and description', () => {
    const prompt = buildWorldBiblePrompt(context);
    expect(prompt).toContain('r/gardening');
    expect(prompt).toContain('plants and soil');
  });

  it('lists the top post titles as bullets', () => {
    const prompt = buildWorldBiblePrompt(context);
    expect(prompt).toContain('- My tomatoes finally fruited');
    expect(prompt).toContain('- Help, what is this weed?');
  });

  it('marks a missing description', () => {
    const prompt = buildWorldBiblePrompt({ ...context, description: '   ' });
    expect(prompt).toContain('(none provided)');
  });

  it('marks the absence of top posts', () => {
    const prompt = buildWorldBiblePrompt({ ...context, topPostTitles: [] });
    expect(prompt).toContain('(none available)');
  });
});