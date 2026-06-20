import type { GameState, LeaderboardEntry, Proposal } from './game';

export type GameResponse = {
  type: 'game';
  state: GameState;
  username: string;
  note?: string;
};

export type ProposalsResponse = {
  type: 'proposals';
  proposals: Proposal[];
  serverNow: number;
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