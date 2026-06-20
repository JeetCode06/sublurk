import type { GameState } from '../shared/game';
import { ROOM_INTRO_SYSTEM_PROMPT, buildRoomIntroPrompt } from './ai/prompt';
import { parseRoomScene } from './ai/parse';
import { callGemini } from './ai/gemini';

// Generates the atmospheric intro for the room the party just entered.
async function describeRoom(state: GameState): Promise<string> {
  const raw = await callGemini(
    ROOM_INTRO_SYSTEM_PROMPT,
    buildRoomIntroPrompt(state)
  );
  return parseRoomScene(raw);
}

// Fills in a freshly entered room's description. A room mid-encounter (one that
// already has a description) or a finished run is returned unchanged by
// reference, so this costs an AI call only when the party reaches a new room.
export async function withRoomIntro(state: GameState): Promise<GameState> {
  if (state.phase !== 'awaiting_actions' || state.room.description !== '') {
    return state;
  }
  const description = await describeRoom(state);
  return { ...state, room: { ...state.room, description } };
}