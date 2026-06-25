import { describe, it, expect } from 'vitest';
import {
  buildTurnPrompt,
  SYSTEM_PROMPT,
  buildRoomIntroPrompt,
  ROOM_INTRO_SYSTEM_PROMPT,
  INTRO_SYSTEM_PROMPT,
  buildIntroPrompt,
  WORLD_BIBLE_SYSTEM_PROMPT,
  buildWorldBiblePrompt,
  MAP_SYSTEM_PROMPT,
  buildMapPrompt,
} from '../src/server/ai/prompt';
import { createInitialState } from '../src/server/game/state';
import { STUCK_LIMIT } from '../src/server/game/resolution';
import type { AbilityCheck, WorldBible } from '../src/shared/game';

const state = createInitialState({
  postId: 't3_abc',
  subredditName: 'r/witchcraft',
  classId: 'witch',
  theme: 'mossy catacombs',
});

const roll: AbilityCheck = {
  ability: 'str',
  advantage: 'advantage',
  rolls: [9, 14],
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
  classNames: {
    warrior: 'Tideguard',
    witch: 'Brine Oracle',
    healer: 'Lantern Tender',
    trickster: 'Wave Skulker',
    adventurer: 'Wanderer',
  },
  intelSeeds: [
    'The drowned bells still toll for the faithless.',
    'Salt remembers every name it has touched.',
    'The deepest nave was sealed from the inside.',
  ],
};

describe('SYSTEM_PROMPT', () => {
  it('specifies the JSON output contract', () => {
    expect(SYSTEM_PROMPT).toContain('narration');
    expect(SYSTEM_PROMPT).toContain('hpDelta');
  });

  it('lists the valid condition vocabulary', () => {
    expect(SYSTEM_PROMPT).toContain('poisoned');
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

  it('lists the party conditions, or none', () => {
    expect(buildTurnPrompt(state, 'wait', roll, bible)).toContain(
      'Conditions: none'
    );
    const sick: typeof state = {
      ...state,
      party: { ...state.party, conditions: ['poisoned'] },
    };
    expect(buildTurnPrompt(sick, 'wait', roll, bible)).toContain('Poisoned');
  });

  it('describes the ability check and its advantage', () => {
    const prompt = buildTurnPrompt(state, 'attack', roll, bible);
    expect(prompt).toContain('Strength check');
    expect(prompt).toContain('with advantage');
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

  it('injects the current map location as the scene rail', () => {
    const prompt = buildTurnPrompt(state, 'attack', roll, bible);
    expect(prompt).toContain('The Threshold');
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

  it('injects the current map location as the scene rail', () => {
    expect(buildRoomIntroPrompt(state, bible)).toContain('The Threshold');
  });

  it('states the room difficulty band', () => {
    const hard = { ...state, room: { ...state.room, difficulty: 20 } };
    expect(buildRoomIntroPrompt(hard, bible)).toContain('Hard (DC 20)');
  });

  it('marks the start of the run when there is no history', () => {
    expect(buildRoomIntroPrompt(state, bible)).toContain('start of the run');
  });

  it('names the location villain when the node has one', () => {
    const withVillain = {
      ...state,
      map: {
        ...state.map,
        nodes: state.map.nodes.map((node, i) =>
          i === state.map.currentNodeIndex
            ? {
                ...node,
                villain: {
                  name: 'the Bean Wraith',
                  concept: 'a ghost of burnt grounds',
                },
              }
            : node
        ),
      },
    };
    const prompt = buildRoomIntroPrompt(withVillain, bible);
    expect(prompt).toContain('the Bean Wraith');
    expect(prompt).toContain('burnt grounds');
  });

  it('reveals more world lore as the run number climbs', () => {
    expect(buildRoomIntroPrompt(state, bible)).toContain('drowned bells');
    expect(buildRoomIntroPrompt(state, bible)).not.toContain(
      'sealed from the inside'
    );
    const deeper = { ...state, runNumber: 6 };
    expect(buildRoomIntroPrompt(deeper, bible)).toContain(
      'sealed from the inside'
    );
  });
});

describe('WORLD_BIBLE_SYSTEM_PROMPT', () => {
  it('specifies the world-bible JSON contract', () => {
    expect(WORLD_BIBLE_SYSTEM_PROMPT).toContain('villain');
    expect(WORLD_BIBLE_SYSTEM_PROMPT).toContain('finalBossConcept');
    expect(WORLD_BIBLE_SYSTEM_PROMPT).toContain('classNames');
    expect(WORLD_BIBLE_SYSTEM_PROMPT).toContain('intelSeeds');
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

describe('MAP_SYSTEM_PROMPT', () => {
  it('specifies the map JSON contract', () => {
    expect(MAP_SYSTEM_PROMPT).toContain('nodes');
    expect(MAP_SYSTEM_PROMPT).toContain('themeTag');
    expect(MAP_SYSTEM_PROMPT).toContain('finalBoss');
  });

  it('asks for a villain per location', () => {
    expect(MAP_SYSTEM_PROMPT).toContain('villain');
    expect(MAP_SYSTEM_PROMPT).toContain('concept');
  });
});

describe('buildMapPrompt', () => {
  it('includes the world, villain, and final confrontation', () => {
    const prompt = buildMapPrompt(bible);
    expect(prompt).toContain('sunken cathedral');
    expect(prompt).toContain('the Tidemother');
    expect(prompt).toContain('flooded nave');
  });

  it('includes the motifs to draw on', () => {
    expect(buildMapPrompt(bible)).toContain('drowned bells');
  });
});

describe('INTRO_SYSTEM_PROMPT', () => {
  it('asks for a cold open and an intro field', () => {
    expect(INTRO_SYSTEM_PROMPT).toContain('cold open');
    expect(INTRO_SYSTEM_PROMPT).toContain('intro');
  });
});

describe('buildIntroPrompt', () => {
  it('states the goal and names the final boss', () => {
    const prompt = buildIntroPrompt(state, bible);
    expect(prompt).toContain('Their goal');
    expect(prompt).toContain(state.map.finalBoss.name);
  });

  it('weaves in the nemesis taunt when the run carries one', () => {
    const haunted = {
      ...state,
      nemesisLine: 'Last time, you fell to the Tidemother at the Drowned Nave.',
    };
    expect(buildIntroPrompt(haunted, bible)).toContain(
      'fell to the Tidemother at the Drowned Nave'
    );
    expect(buildIntroPrompt(state, bible)).not.toContain(
      'remembers this party'
    );
  });
});

describe('suggestions in prompts', () => {
  it('asks both the scene and turn prompts for suggestions', () => {
    expect(ROOM_INTRO_SYSTEM_PROMPT).toContain('suggestions');
    expect(SYSTEM_PROMPT).toContain('suggestions');
  });
});

describe('stuck escalation', () => {
  it('tells the AI to force a way onward when the party keeps failing', () => {
    const stuck: typeof state = { ...state, roomFailures: STUCK_LIMIT - 1 };
    expect(buildTurnPrompt(stuck, 'wait', roll, bible)).toContain(
      'force a way onward'
    );
  });
});