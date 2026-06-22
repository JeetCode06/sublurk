import type { GameState, Scene, WorldBible } from '../shared/game';
import {
  ROOM_INTRO_SYSTEM_PROMPT,
  buildRoomIntroPrompt,
  INTRO_SYSTEM_PROMPT,
  buildIntroPrompt,
} from './ai/prompt';
import { parseScene, parseIntro } from './ai/parse';
import { callGemini } from './ai/gemini';

// Generates the structured scene for the room the party just entered — prose
// plus the foes, NPCs, objects, and threats that fill the board — set in the
// subreddit's own world.
async function describeRoom(
  state: GameState,
  bible: WorldBible
): Promise<Scene> {
  const raw = await callGemini(
    ROOM_INTRO_SYSTEM_PROMPT,
    buildRoomIntroPrompt(state, bible)
  );
  return parseScene(raw);
}

// Writes the run's cold open — who the party is, the world's mood, and the
// goal — once per run. Costs an AI call only at the very start of a run, when
// the intro is still empty and the party is at the first room; otherwise the
// state is returned unchanged.
export async function withIntro(
  state: GameState,
  bible: WorldBible
): Promise<GameState> {
  if (
    state.intro !== '' ||
    state.party.depth !== 0 ||
    state.phase !== 'awaiting_actions'
  ) {
    return state;
  }
  const raw = await callGemini(
    INTRO_SYSTEM_PROMPT,
    buildIntroPrompt(state, bible)
  );
  return { ...state, intro: parseIntro(raw) };
}

// Fills in a freshly entered room's scene, and on the first room of a run also
// writes the cold open. A room mid-encounter (one that already has a
// description) or a finished run is returned unchanged by reference, so this
// costs AI calls only when the party reaches a new room.
export async function withRoomIntro(
  state: GameState,
  bible: WorldBible
): Promise<GameState> {
  const opened = await withIntro(state, bible);
  if (opened.phase !== 'awaiting_actions' || opened.room.description !== '') {
    return opened;
  }
  const scene = await describeRoom(opened, bible);
  return {
    ...opened,
    room: {
      ...opened.room,
      description: scene.description,
      entities: scene.entities,
      threats: scene.threats,
      suggestions: scene.suggestions,
    },
  };
}