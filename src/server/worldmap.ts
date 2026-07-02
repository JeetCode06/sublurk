import type { MapState, WorldBible } from '../shared/game';
import { MAP_SYSTEM_PROMPT, buildMapPrompt } from './ai/prompt';
import { parseMap } from './ai/parse';
import { callGemini, WORLD_GEN_TIMEOUT_MS } from './ai/gemini';
import { loadMap, saveMap } from './data/map';

// Designs a subreddit's campaign journey from its world-bible: a path of themed
// locations toward the bible's final boss. Any AI failure degrades to the
// default journey inside parseMap.
export async function generateMap(bible: WorldBible): Promise<MapState> {
  const raw = await callGemini(
    MAP_SYSTEM_PROMPT,
    buildMapPrompt(bible),
    WORLD_GEN_TIMEOUT_MS
  );
  return parseMap(raw);
}

// Returns the subreddit's campaign map, generating and storing it once on first
// use and reusing it thereafter, so a map costs an AI call only once per
// subreddit. Takes the world-bible the journey is built from.
export async function ensureMap(bible: WorldBible): Promise<MapState> {
  const existing = await loadMap();
  if (existing) return existing;
  const map = await generateMap(bible);
  await saveMap(map);
  return map;
}