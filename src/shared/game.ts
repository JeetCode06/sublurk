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
  | 'intermission';

export type Outcome = 'success' | 'partial' | 'fail';

export type Party = {
  hp: number;
  maxHp: number;
  gold: number;
  depth: number;
  inventory: string[];
  statuses: string[];
  classId: ClassId;
  name: string;
};

export type Room = {
  type: RoomType;
  description: string;
  difficulty: number;
  // Per-room server-only state, e.g. a monster's remaining hp. Shape varies by room type.
  situation: Record<string, unknown>;
};

export type GameState = {
  runNumber: number;
  phase: GamePhase;
  postId: string;
  theme: string;
  party: Party;
  room: Room;
  recentEvents: string[];
  nextResolveAt: number; // unix ms
  voteThreshold: number;
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
};