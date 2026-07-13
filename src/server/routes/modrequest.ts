import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type { ErrorResponse, ModRequestResponse } from '../../shared/api';
import {
  normalizeSubredditName,
  evaluateModRequest,
  applyModRequest,
  buildModRequestMessage,
} from '../core/modrequest';
import {
  readModRequestRecord,
  writeModRequestRecord,
} from '../data/modrequest';
import { errorMessage } from './helpers';

export const modrequest = new Hono();

// Lets a non-moderator ask another community's mods to add the game. Spam is
// held off two ways: a community can only be asked once per user, and a user can
// only ask a few communities per day. Every request names the asking redditor.
modrequest.post('/', async (c) => {
  try {
    const body = await c.req.json<{ subreddit?: unknown }>();
    const subreddit =
      typeof body.subreddit === 'string'
        ? normalizeSubredditName(body.subreddit)
        : null;
    if (subreddit === null) {
      return c.json<ModRequestResponse>(
        { type: 'modRequest', status: 'invalid' },
        400
      );
    }

    const userId = context.userId;
    const username = await reddit.getCurrentUsername();
    if (!userId || !username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'You must be logged in to make a request' },
        401
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const record = await readModRequestRecord(userId);
    const verdict = evaluateModRequest({ record, subreddit, today });
    if (verdict !== 'ok') {
      return c.json<ModRequestResponse>(
        { type: 'modRequest', status: verdict, subreddit },
        200
      );
    }

    const { subject, body: mailBody } = buildModRequestMessage({
      subreddit,
      username,
    });
    await reddit.modMail.createConversation({
      subredditName: subreddit,
      subject,
      body: mailBody,
      isAuthorHidden: false,
    });
    await writeModRequestRecord(
      userId,
      applyModRequest(record, subreddit, today)
    );

    return c.json<ModRequestResponse>(
      { type: 'modRequest', status: 'sent', subreddit },
      200
    );
  } catch (error) {
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});
