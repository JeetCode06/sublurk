import type { GameState } from '../../shared/game';
import type { DiceRoll } from '../game/dice';

export const SYSTEM_PROMPT = `You are the Dungeon Master for a collaborative Reddit dungeon crawler. A whole community controls one party by voting on actions in the comments.

Narrate the outcome of the party's chosen action in 2-4 vivid sentences, then report the mechanical result.

Rules:
- The dice have already decided how well the action goes. Honor the given outcome: "success", "partial" (it works, but at a cost), or "fail".
- Never grant instant wins, huge rewards, or a free escape from danger. Stay consistent with the party's current HP, gold, and the room.
- Keep it tense and fun, match the dungeon's theme, and keep content safe for a general audience.
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

export function buildTurnPrompt(
  state: GameState,
  action: string,
  roll: DiceRoll
): string {
  const { party, room, theme, recentEvents } = state;
  const lines = [
    `Dungeon theme: ${theme}`,
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

Describe what the party sees in 2-3 vivid, atmospheric sentences. Set the mood and hint at the room's danger or promise, but do NOT resolve anything, invent specific numbers, or decide what the party does next — the community will choose that.

Match the dungeon's theme and keep content safe for a general audience. Respond with ONLY a JSON object, no markdown and no extra text, in exactly this shape:
{ "scene": string }`;

export function buildRoomIntroPrompt(state: GameState): string {
  const { party, room, theme, recentEvents } = state;
  const lastEvent = recentEvents.at(-1);
  const lines = [
    `Dungeon theme: ${theme}`,
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