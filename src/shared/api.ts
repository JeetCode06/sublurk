import type { ClassId, GameState, LeaderboardEntry, Proposal } from './game';

export type GameResponse = {
  type: 'game';
  state: GameState;
  username: string;
  note?: string;
  // True when the narrator was unreachable and the turn fell back — the client
  // shows an "out of energy" cooldown instead of a broken retry loop.
  degraded?: boolean;
};

// Tells the client what kind of post it opened in: the shared community board,
// or a private solo run. isMod gates moderator-only board controls.
export type ContextResponse = {
  type: 'context';
  kind: 'community' | 'solo';
  isMod: boolean;
};

export type ProposalsResponse = {
  type: 'proposals';
  proposals: Proposal[];
  serverNow: number;
  state: GameState | null;
};

export type ActionRequest = {
  action: string;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  entries: LeaderboardEntry[];
};

export type ClassNamesResponse = {
  type: 'classNames';
  names: Record<ClassId, string>;
};

// The Reddit Apps directory page for installing the game. Placeholder until the
// app is published; update this to the published app's URL at launch. Shared so
// the install CTA and the mod-request modmail point at the same place.
export const INSTALL_URL = 'https://developers.reddit.com/apps/hivemind-crawl';

export type ModRequestResponse = {
  type: 'modRequest';
  status: 'sent' | 'already_requested' | 'daily_limit' | 'invalid';
  subreddit?: string;
};