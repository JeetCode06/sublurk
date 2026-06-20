import type { Proposal } from '../../shared/game';

// Recap comments the app posts after each turn start with this marker, so the
// resolver and the candidate-actions panel can tell them apart from real plays.
export const RECAP_MARKER = '🎲';

const MIN_PROPOSAL_LENGTH = 2;
const MAX_PROPOSALS = 8;

function isPlayable(proposal: Proposal): boolean {
  const body = proposal.body.trim();
  if (body.length < MIN_PROPOSAL_LENGTH) return false;
  if (body.startsWith(RECAP_MARKER)) return false;
  return body !== '[deleted]' && body !== '[removed]';
}

// Turns the post's comments into the ranked candidate actions the community is
// voting on: playable comments only, highest score first, capped. The first
// entry is the action that will resolve.
export function rankProposals(proposals: Proposal[]): Proposal[] {
  return proposals
    .filter(isPlayable)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PROPOSALS);
}