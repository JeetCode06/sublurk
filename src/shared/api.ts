import type { GameState } from './game';

export type GameResponse = {
  type: 'game';
  state: GameState;
  username: string;
};

export type ActionRequest = {
  action: string;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
