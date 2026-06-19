import type { ClassId } from '../../shared/game';

const CLASS_IDS: ClassId[] = [
  'warrior',
  'witch',
  'healer',
  'trickster',
  'adventurer',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Each subreddit deterministically gets one class, so a community's party
// identity stays the same every run.
export function classForSubreddit(subredditName: string): ClassId {
  const index = hashString(subredditName) % CLASS_IDS.length;
  return CLASS_IDS[index] ?? 'adventurer';
}

export function themeForSubreddit(subredditName: string): string {
  return `the shifting catacombs beneath r/${subredditName}`;
}
