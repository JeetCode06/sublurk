import type {
  AbilityCheck,
  Advantage,
  GameState,
  WorldBible,
} from '../../shared/game';
import { ABILITY_LABELS } from '../game/abilities';
import { BAND_LABELS, bandForDC } from '../game/difficulty';
import { CONDITIONS, CONDITION_IDS } from '../game/conditions';
import { STUCK_LIMIT } from '../game/resolution';

export const SYSTEM_PROMPT = `You are the Dungeon Master for a collaborative Reddit dungeon crawler. A whole community controls one party by voting on actions in the comments.

Narrate the outcome of the party's chosen action in 2-4 vivid sentences, then report the mechanical result.

Rules:
- The dice have already decided how well the action goes. Honor the given outcome: "success", "partial" (it works, but at a cost), or "fail".
- Never grant instant wins, huge rewards, or a free escape from danger. Stay consistent with the party's current HP, gold, and the room.
- Keep it tense and fun, match the world and weave in its villain and motifs when it fits, and keep content safe for a general audience.
- The only conditions you may put in statusAdd or statusRemove are: ${CONDITION_IDS.join(', ')}. Each makes the party's ability checks harder. Apply one when the fiction earns it and lift it when they recover; any other word is ignored.
- The party automatically loses a little health each turn to lingering conditions like poison or exhaustion. Do not also deduct for those ongoing effects in hpDelta — use hpDelta only for the direct result of this action.
- "suggestions": 2-3 short, concrete actions the party could try next given how this turn went, each a brief imperative phrase (e.g. "Press the attack", "Bind the wound", "Search the wreckage"). Options for the community to weigh, not commands.
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
  "death": boolean,
  "suggestions": string[]
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

// The party's current stop on the campaign map. Its theme tag is the spatial
// "rail" — it keeps scenes consistent with where the party actually is, so a
// marsh location yields marsh scenes rather than wandering off-world.
function locationLine(state: GameState): string {
  const node = state.map.nodes[state.map.currentNodeIndex];
  if (!node) return `Current location: deep in the dungeon.`;
  const villain = node.villain
    ? ` This place answers to ${node.villain.name} — ${node.villain.concept}. Let their presence be felt, without resolving anything.`
    : '';
  return `Current location: ${node.name} — ${node.themeTag}.${villain}`;
}

function advantagePhrase(advantage: Advantage): string {
  if (advantage === 'advantage') return ' with advantage';
  if (advantage === 'disadvantage') return ' with disadvantage';
  return '';
}

// Escalating nudge when the party keeps failing the same room, so a run can't
// stall: a hard shove onward at the limit, a softer raise of stakes before it.
function pressureLine(state: GameState): string {
  if (state.roomFailures >= STUCK_LIMIT - 1) {
    return `The party has already failed here ${state.roomFailures} times and cannot remain — force a way onward this turn: an opening, an escape, or the danger driving them out, even at a cost.`;
  }
  if (state.roomFailures >= 2) {
    return `The party has failed here ${state.roomFailures} times. Raise the stakes and push the scene toward a change.`;
  }
  return '';
}

export function buildTurnPrompt(
  state: GameState,
  action: string,
  check: AbilityCheck,
  bible: WorldBible
): string {
  const { party, room, recentEvents } = state;
  const lines = [
    ...worldContextLines(bible),
    locationLine(state),
    `Party: ${party.name} (class: ${party.classId})`,
    `HP: ${party.hp}/${party.maxHp} | Gold: ${party.gold} | Depth: ${party.depth}`,
    `Inventory: ${party.inventory.length > 0 ? party.inventory.join(', ') : 'empty'}`,
    `Conditions: ${party.conditions.length > 0 ? party.conditions.map((c) => CONDITIONS[c].name).join(', ') : 'none'}`,
    `Current room: a ${room.type} room (difficulty ${BAND_LABELS[bandForDC(room.difficulty)]}, DC ${room.difficulty}). ${room.description}`,
    recentEvents.length > 0
      ? `Recently: ${recentEvents.join(' ')}`
      : `This is the party's first move.`,
    `The community chose: "${action}"`,
    `The party made a ${ABILITY_LABELS[check.ability]} check${advantagePhrase(check.advantage)} and rolled a ${check.outcome} (rolled ${check.die}, total ${check.total} vs difficulty ${check.difficulty}).`,
    pressureLine(state),
    `Narrate this outcome and return the JSON.`,
  ];
  return lines.filter((line) => line.length > 0).join('\n');
}

export const INTRO_SYSTEM_PROMPT = `You are the Dungeon Master opening a new run of a collaborative Reddit dungeon crawler, where a whole community controls one party by voting in the comments.

Write a short, punchy cold open of 3-4 sentences that does three things: introduce who this party is and how they came to be here, set the mood of the world, and state plainly what they must do — the goal and the foe waiting at the end. Speak to the community as the shared will guiding the party ("you"). End on a beat that invites them to act. Do NOT describe a specific room, resolve anything, or decide the first action — the community chooses that next.

Match the world, let its villain loom, and keep content safe for a general audience. Respond with ONLY a JSON object, no markdown and no extra text, in exactly this shape:
{
  "intro": string
}`;

export function buildIntroPrompt(state: GameState, bible: WorldBible): string {
  const { party, map } = state;
  const start = map.nodes[0];
  const destination = map.nodes.at(-1);
  const lines = [
    ...worldContextLines(bible),
    `Party: ${party.name} (class: ${party.classId})`,
    start ? `They set out from ${start.name} — ${start.themeTag}.` : '',
    `Their goal: reach ${destination ? destination.name : 'the heart of the dungeon'} and defeat ${map.finalBoss.name}.`,
    `Write the cold open for this run.`,
  ].filter((line) => line.length > 0);
  return lines.join('\n');
}

export const ROOM_INTRO_SYSTEM_PROMPT = `You are the Dungeon Master for a collaborative Reddit dungeon crawler, setting the scene as the party enters a new room.

Describe what the party sees in 2-3 vivid, atmospheric sentences, then list what is actually present as structured data the game renders as a board. Do NOT resolve anything, invent specific outcomes, or decide what the party does next — the community will choose that.

For the scene's contents:
- "entities": the things that stand out, each with a "kind" of "foe" (a creature or enemy), "npc" (a character who can be spoken to), or "object" (a thing that can be examined or used), plus a short "name" and a one-line "blurb". Include 0-4 entities — only what truly matters, and none in an empty room. For a "foe" only, also give a "threat" from 1 (minor) to 5 (deadly) and an "hp" from 5 to 40. Leave "threat" and "hp" off NPCs and objects.
- "threats": 0-3 short phrases naming active dangers in the room (e.g. "rising water", "crumbling floor"). Use an empty list if the room is calm.
- "suggestions": 2-3 short, concrete actions the party could try here, each a brief imperative phrase (e.g. "Search the altar", "Attack the wraith", "Slip past in the dark"). These are options for the community to weigh, not commands.

Match the world and let its villain loom when fitting, and keep content safe for a general audience. Respond with ONLY a JSON object, no markdown and no extra text, in exactly this shape:
{
  "description": string,
  "entities": [{ "kind": "foe" | "npc" | "object", "name": string, "blurb": string, "threat": number, "hp": number }],
  "threats": string[],
  "suggestions": string[]
}`;

export function buildRoomIntroPrompt(
  state: GameState,
  bible: WorldBible
): string {
  const { party, room, recentEvents } = state;
  const lastEvent = recentEvents.at(-1);
  const lines = [
    ...worldContextLines(bible),
    locationLine(state),
    `Party: ${party.name} (class: ${party.classId})`,
    `Depth: ${party.depth} | HP: ${party.hp}/${party.maxHp}`,
    `They have just entered a ${room.type} room.`,
    `The challenge here is ${BAND_LABELS[bandForDC(room.difficulty)]} (DC ${room.difficulty}).`,
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
- "classNames": this world's own name for each of five hero archetypes, given as keys "warrior" (a frontline fighter), "witch" (an arcane caster), "healer" (a supportive mender), "trickster" (a cunning rogue), and "adventurer" (a balanced wanderer). Each value is a short, evocative title of 1-3 words fitting the world — name the role, never a real or specific person.

Keep everything original (no copyrighted characters, settings, or names) and safe for a general audience. Respond with ONLY a JSON object, no markdown and no extra text, in exactly this shape:
{
  "theme": string,
  "villain": { "name": string, "motive": string },
  "heroFlavor": string,
  "motifs": string[],
  "itemVocabulary": string[],
  "artStyle": string,
  "finalBossConcept": string,
  "classNames": { "warrior": string, "witch": string, "healer": string, "trickster": string, "adventurer": string }
}`;

export function buildWorldBiblePrompt(context: SubredditContext): string {
  const { name, description, topPostTitles } = context;
  const trimmedDescription = description.trim();
  const titleBullets = topPostTitles.map((title) => `- ${title}`).join('\n');
  const lines = [
    `Subreddit: r/${name}`,
    trimmedDescription.length > 0
      ? `Description: ${trimmedDescription}`
      : `Description: (none provided)`,
    topPostTitles.length > 0
      ? `Top post titles:\n${titleBullets}`
      : `Top post titles: (none available)`,
    `Invent this community's original fantasy world and return the JSON.`,
  ];
  return lines.join('\n');
}

export const MAP_SYSTEM_PROMPT = `You are designing the journey for a collaborative Reddit dungeon crawler. Given a world, lay out the path the party travels from the start to the final confrontation: a sequence of distinct, themed locations that builds tension toward the end.

Design 4-6 locations in order, each a different biome or place in this world, escalating toward the final boss's domain — the last location is where the boss waits. For each location give:
- "name": an evocative place name (e.g. "The Withered Orchard").
- "themeTag": a short scene-setting phrase for the place, which the dungeon master will reuse to keep every scene there consistent (e.g. "a frostbitten orchard of blackened, clawing trees").
- "villain": the antagonist who holds this location — a "name" (e.g. "Mother Bramble") and a one-line "concept" of who they are and what they want here. Every location's villain is distinct and themed to the world, and together they escalate toward the final boss; the LAST location's villain IS the final boss and shares its name.

Also name the "finalBoss" — the world's villain or its avatar, matching the last location's villain.

Keep everything original, coherent with the world, and safe for a general audience. Respond with ONLY a JSON object, no markdown and no extra text, in exactly this shape:
{
  "nodes": [{ "name": string, "themeTag": string, "villain": { "name": string, "concept": string } }],
  "finalBoss": { "name": string }
}`;

export function buildMapPrompt(bible: WorldBible): string {
  const lines = [
    `World: ${bible.theme}`,
    `Villain: ${bible.villain.name}, who seeks ${bible.villain.motive}`,
    `The final confrontation: ${bible.finalBossConcept}`,
    `Motifs to draw on: ${bible.motifs.join(', ')}`,
    `Give each location a distinct villain — lesser powers, guardians, or lieutenants — escalating toward ${bible.villain.name} at the final location.`,
    `Design the party's journey through this world and return the JSON.`,
  ];
  return lines.join('\n');
}