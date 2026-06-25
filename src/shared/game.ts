// Shared game types: the data contract between the client and the server.

export type RoomType =
  | 'combat'
  | 'puzzle'
  | 'treasure'
  | 'trap'
  | 'npc'
  | 'shop'
  | 'rest'
  | 'boss';

export type ClassId =
  | 'warrior'
  | 'witch'
  | 'healer'
  | 'trickster'
  | 'adventurer';

export type GamePhase =
  | 'awaiting_actions'
  | 'resolving'
  | 'dead'
  | 'won'
  | 'intermission';

export type Outcome = 'success' | 'partial' | 'fail';

// The six classic tabletop abilities. Ability checks roll a d20 plus the
// relevant ability's modifier against a difficulty.
export type AbilityId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

// A party's ability scores (roughly 8-16), one per ability.
export type Abilities = Record<AbilityId, number>;

// The subset of SRD conditions the party can carry. Each makes the party's
// ability checks harder (disadvantage); they're applied and lifted in play.
export type ConditionId =
  | 'poisoned'
  | 'frightened'
  | 'blinded'
  | 'restrained'
  | 'exhausted'
  | 'charmed';

// Whether a check rolls one die, or two keeping the better (advantage) or worse
// (disadvantage) — the tabletop way a class's strengths and weaknesses bend the
// odds without changing the target number.
export type Advantage = 'normal' | 'advantage' | 'disadvantage';

// The full record of a resolved ability check, kept rich enough to narrate and
// to show the player exactly what was rolled.
export type AbilityCheck = {
  ability: AbilityId;
  advantage: Advantage;
  rolls: number[];
  die: number;
  modifier: number;
  total: number;
  difficulty: number;
  outcome: Outcome;
};

export type Party = {
  hp: number;
  maxHp: number;
  gold: number;
  depth: number;
  inventory: string[];
  conditions: ConditionId[];
  classId: ClassId;
  name: string;
  abilities: Abilities;
};

export type EntityKind = 'foe' | 'npc' | 'object';

// One thing present in the current scene — a foe, an NPC, or an object — shown
// as a card on the board. Foes may carry a threat level and remaining hp so the
// UI can draw a bar; non-combat entities leave those unset.
export type SceneEntity = {
  kind: EntityKind;
  name: string;
  blurb: string;
  threat?: number;
  hp?: number;
};

export type Room = {
  type: RoomType;
  description: string;
  difficulty: number;
  // What currently fills the scene (foes, NPCs, objects) and the active dangers
  // in it, both rendered on the board. Empty until the AI populates a new scene.
  entities: SceneEntity[];
  threats: string[];
  // 2-3 concrete actions the party could try right now, offered to the players
  // so a turn never starts from a blank prompt. Refreshed each turn.
  suggestions: string[];
  // Per-room server-only state, e.g. a monster's remaining hp. Shape varies by room type.
  situation: Record<string, unknown>;
};

// The narrative slice of a room the AI authors for a new scene: the prose plus
// what fills the board. Merged into the room when the party enters it.
export type Scene = Pick<
  Room,
  'description' | 'entities' | 'threats' | 'suggestions'
>;

// One location on the campaign map — a themed biome the party passes through on
// the way to the final boss. Its themeTag constrains the scenes generated while
// the party is here (the spatial "rail" that keeps a forest node forest-like).
export type MapNode = {
  id: string;
  name: string;
  themeTag: string;
  cleared: boolean;
  // Optional villain that rules this location, themed to the subreddit. Filled
  // in by world generation later; absent on older saves and early nodes.
  villain?: { name: string; concept: string };
};

// The campaign's journey: an ordered list of locations toward one fixed final
// boss. currentNodeIndex is where the party stands in the current run.
export type MapState = {
  nodes: MapNode[];
  currentNodeIndex: number;
  finalBoss: { name: string; defeated: boolean };
};

export type GameState = {
  runNumber: number;
  phase: GamePhase;
  postId: string;
  theme: string;
  party: Party;
  room: Room;
  map: MapState;
  intro: string;
  recentEvents: string[];
  nextResolveAt: number; // unix ms
  voteThreshold: number;
  // Consecutive failed turns in the current room. Drives escalation and a hard
  // forced exit so a room can never become an infinite loop.
  roomFailures: number;
  // The nemesis's remembered taunt for this run, drawn from past runs' outcomes
  // at run start. Empty on a first descent. Surfaces in the cold open and on the
  // run-summary screen.
  nemesisLine: string;
  lastCheck?: AbilityCheck;
};

// Produced by the AI each turn, then validated and clamped server-side before it is applied.
export type ResolveResult = {
  narration: string;
  outcome: Outcome;
  hpDelta: number;
  goldDelta: number;
  inventoryAdd: string[];
  inventoryRemove: string[];
  statusAdd: string[];
  statusRemove: string[];
  roomResolved: boolean;
  nextRoomHint: string | null;
  death: boolean;
  // Fresh suggestions for what to try next, given how this turn went.
  suggestions: string[];
};

// A candidate action the community has proposed: one comment on the post,
// carried with its live upvote score. The panel lists these; the top one resolves.
export type Proposal = {
  id: string;
  body: string;
  score: number;
};

// A run's standing on the leaderboard: how deep it reached. One entry per run.
export type LeaderboardEntry = {
  runNumber: number;
  depth: number;
};

// --- v2: campaign world ---

// The villain at the heart of a subreddit's campaign: a named antagonist with a
// motive the AI can reference and escalate across runs.
export type Villain = {
  name: string;
  motive: string;
};

// A one-time, AI-authored description of a subreddit's world, generated at the
// start of a campaign from the subreddit itself and injected into later prompts
// so every scene stays coherent. Treated as untrusted until coerced server-side.
export type WorldBible = {
  theme: string;
  villain: Villain;
  heroFlavor: string;
  motifs: string[];
  itemVocabulary: string[];
  artStyle: string;
  finalBossConcept: string;
  // This world's own name for each hero archetype, keyed by class id. Themed to
  // the subreddit; falls back to the base archetype names.
  classNames: Record<ClassId, string>;
  // Short lore fragments about this world, revealed progressively as the party
  // descends across runs so deeper campaigns surface more of the world.
  intelSeeds: string[];
};