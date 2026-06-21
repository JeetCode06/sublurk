import type { GameState, WorldBible } from '../../shared/game';
import type { DiceRoll } from '../game/dice';

export const SYSTEM_PROMPT = `You are the Dungeon Master for a collaborative Reddit dungeon crawler. A whole community controls one party by voting on actions in the comments.

Narrate the outcome of the party's chosen action in 2-4 vivid sentences, then report the mechanical result.

Rules:
- The dice have already decided how well the action goes. Honor the given outcome: "success", "partial" (it works, but at a cost), or "fail".
- Never grant instant wins, huge rewards, or a free escape from danger. Stay consistent with the party's current HP, gold, and the room.
- Keep it tense and fun, match the world and weave in its villain and motifs when it fits, and keep content safe for a general audience.
- Respond with ONLY a JSON object, no markdown and no extra text, in exactly this shape:
{
  "narration": string,
  "outcome": "success" | "partial" | "fail",
  "hpDelta": number,
  "goldDelta": number,
  "inventoryAdd": string[],
  "inventoryRemove": string[],
  "statusAdd": string[],
  "statusRemove": string[],
  "roomResolved": boolean,
  "nextRoomHint": string | null,
  "death": boolean
}`;

// The shared world context injected into every prompt so each turn reflects the
// subreddit's own campaign — its setting, its named villain, and its motifs —
// rather than generic dungeon text.
function worldContextLines(bible: WorldBible): string[] {
  return [
    `World: ${bible.theme}`,
    `Looming threat: ${bible.villain.name}, who seeks ${bible.villain.motive}`,
    `The party: ${bible.heroFlavor}`,
    `Motifs to weave in: ${bible.motifs.join(', ')}`,
  ];
}

export function buildTurnPrompt(
  state: GameState,
  action: string,
  roll: DiceRoll,
  bible: WorldBible
): string {
  const { party, room, recentEvents } = state;
  const lines = [
    ...worldContextLines(bible),
    `Party: ${party.name} (class: ${party.classId})`,
    `HP: ${party.hp}/${party.maxHp} | Gold: ${party.gold} | Depth: ${party.depth}`,
    `Inventory: ${party.inventory.length > 0 ? party.inventory.join(', ') : 'empty'}`,
    `Statuses: ${party.statuses.length > 0 ? party.statuses.join(', ') : 'none'}`,
    `Current room: a ${room.type} room. ${room.description}`,
    recentEvents.length > 0
      ? `Recently: ${recentEvents.join(' ')}`
      : `This is the party's first move.`,
    `The community chose: "${action}"`,
    `The dice rolled a ${roll.outcome} (total ${roll.total} vs difficulty ${roll.difficulty}).`,
    `Narrate this outcome and return the JSON.`,
  ];
  return lines.join('\n');
}

export const ROOM_INTRO_SYSTEM_PROMPT = `You are the Dungeon Master for a collaborative Reddit dungeon crawler, setting the scene as the party enters a new room.

Describe what the party sees in 2-3 vivid, atmospheric sentences, then list what is actually present as structured data the game renders as a board. Do NOT resolve anything, invent specific outcomes, or decide what the party does next — the community will choose that.

For the scene's contents:
- "entities": the things that stand out, each with a "kind" of "foe" (a creature or enemy), "npc" (a character who can be spoken to), or "object" (a thing that can be examined or used), plus a short "name" and a one-line "blurb". Include 0-4 entities — only what truly matters, and none in an empty room. For a "foe" only, also give a "threat" from 1 (minor) to 5 (deadly) and an "hp" from 5 to 40. Leave "threat" and "hp" off NPCs and objects.
- "threats": 0-3 short phrases naming active dangers in the room (e.g. "rising water", "crumbling floor"). Use an empty list if the room is calm.

Match the world and let its villain loom when fitting, and keep content safe for a general audience. Respond with ONLY a JSON object, no markdown and no extra text, in exactly this shape:
{
  "description": string,
  "entities": [{ "kind": "foe" | "npc" | "object", "name": string, "blurb": string, "threat": number, "hp": number }],
  "threats": string[]
}`;

export function buildRoomIntroPrompt(
  state: GameState,
  bible: WorldBible
): string {
  const { party, room, recentEvents } = state;
  const lastEvent = recentEvents.at(-1);
  const lines = [
    ...worldContextLines(bible),
    `Party: ${party.name} (class: ${party.classId})`,
    `Depth: ${party.depth} | HP: ${party.hp}/${party.maxHp}`,
    `They have just entered a ${room.type} room.`,
    lastEvent
      ? `Moments ago: ${lastEvent}`
      : `This is the very start of the run.`,
    `Set the scene for this ${room.type} room and return the JSON.`,
  ];
  return lines.join('\n');
}

// The raw material a world-bible is generated from: the host subreddit's own
// name, description, and a sample of its top post titles.
export type SubredditContext = {
  name: string;
  description: string;
  topPostTitles: string[];
};

export const WORLD_BIBLE_SYSTEM_PROMPT = `You are a master worldbuilder creating a one-time "world bible" for a collaborative Reddit dungeon crawler. A whole subreddit will play through this world together, so it should feel tailor-made for that community while standing on its own as an original fantasy setting.

You are given the subreddit's name, its description, and some of its top post titles. Use them ONLY as loose inspiration for mood, motifs, and vocabulary — translate the community's spirit into an original dungeon-fantasy world. Do NOT mention Reddit, the subreddit, moderators, upvotes, or that this is a game, and do NOT reference real or living people.

Design:
- "theme": the world's setting and what has gone wrong in it, in 1-2 vivid sentences.
- "villain": a named antagonist driving the threat, with a short "motive".
- "heroFlavor": what the party is in this world, in one evocative phrase.
- "motifs": 4-6 short recurring images or vocabulary a dungeon master can reuse.
- "itemVocabulary": 3-5 flavored names for treasures and tools that fit the world.
- "artStyle": a short comma-separated visual style for illustrating scenes.
- "finalBossConcept": what waits at the end of the journey, usually the villain or its avatar.

Keep everything original (no copyrighted characters, settings, or names) and safe for a general audience. Respond with ONLY a JSON object, no markdown and no extra text, in exactly this shape:
{
  "theme": string,
  "villain": { "name": string, "motive": string },
  "heroFlavor": string,
  "motifs": string[],
  "itemVocabulary": string[],
  "artStyle": string,
  "finalBossConcept": string
}`;

export function buildWorldBiblePrompt(context: SubredditContext): string {
  const { name, description, topPostTitles } = context;
  const trimmedDescription = description.trim();
  const lines = [
    `Subreddit: r/${name}`,
    trimmedDescription.length > 0
      ? `Description: ${trimmedDescription}`
      : `Description: (none provided)`,
    topPostTitles.length > 0
      ? `Top post titles:\n${topPostTitles.map((title) => `- ${title}`).join('\n')}`
      : `Top post titles: (none available)`,
    `Invent this community's original fantasy world and return the JSON.`,
  ];
  return lines.join('\n');
}

export const MAP_SYSTEM_PROMPT = `You are designing the journey for a collaborative Reddit dungeon crawler. Given a world, lay out the path the party travels from the start to the final confrontation: a sequence of distinct, themed locations that builds tension toward the end.

Design 4-6 locations in order, each a different biome or place in this world, escalating toward the final boss's domain — the last location is where the boss waits. For each location give:
- "name": an evocative place name (e.g. "The Withered Orchard").
- "themeTag": a short scene-setting phrase for the place, which the dungeon master will reuse to keep every scene there consistent (e.g. "a frostbitten orchard of blackened, clawing trees").

Also name the "finalBoss" — usually the world's villain or its avatar.

Keep everything original, coherent with the world, and safe for a general audience. Respond with ONLY a JSON object, no markdown and no extra text, in exactly this shape:
{
  "nodes": [{ "name": string, "themeTag": string }],
  "finalBoss": { "name": string }
}`;

export function buildMapPrompt(bible: WorldBible): string {
  const lines = [
    `World: ${bible.theme}`,
    `Villain: ${bible.villain.name}, who seeks ${bible.villain.motive}`,
    `The final confrontation: ${bible.finalBossConcept}`,
    `Motifs to draw on: ${bible.motifs.join(', ')}`,
    `Design the party's journey through this world and return the JSON.`,
  ];
  return lines.join('\n');
}