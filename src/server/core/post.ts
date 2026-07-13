import { reddit, redis, context } from '@devvit/web/server';
import { loadGame, saveGame } from '../data/games';

type PostKind = 'community' | 'solo';

const postKindKey = (postId: string): string => `crawl:post:${postId}:kind`;

// Creates a post and stamps it as either the shared community game or a private
// solo demo, so the app knows on open which experience to show. The stamp is
// permanent: a post is one thing for its whole life.
export const createPost = async (kind: PostKind) => {
  const post = await reddit.submitCustomPost({ title: 'Sublurk' });
  await redis.set(postKindKey(post.id), kind);
  // A sub has one shared community game, keyed by subreddit, but proposals are
  // read from the post the game points at. Re-point an existing game at the
  // newest community post so comments there are the ones that count.
  if (kind === 'community') {
    const game = await loadGame();
    if (game) {
      await saveGame({ ...game, postId: post.id });
    }
  }
  return post;
};

// The kind of the post the app is currently running in. Posts made before this
// stamp existed carry none and default to solo, matching their prior behaviour.
export async function postKind(): Promise<PostKind> {
  const { postId } = context;
  if (!postId) return 'solo';
  const stamped = await redis.get(postKindKey(postId));
  return stamped === 'community' ? 'community' : 'solo';
}
