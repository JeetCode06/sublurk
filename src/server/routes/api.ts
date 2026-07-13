import { Hono } from 'hono';
import type { ClassNamesResponse, ContextResponse } from '../../shared/api';
import { postKind } from '../core/post';
import { SOLO_WORLD_BIBLE } from '../soloworld';
import { community } from './community';
import { solo } from './solo';
import { modrequest } from './modrequest';
import { isCurrentUserMod } from './helpers';

export const api = new Hono();

// The themed name for each hero archetype, for the character screen. Solo is
// the only caller and its world is fixed, so the names come from the solo bible.
api.get('/classes', (c) => {
  return c.json<ClassNamesResponse>({
    type: 'classNames',
    names: SOLO_WORLD_BIBLE.classNames,
  });
});

// Tells the client whether this post is the shared community board or a private
// solo run, so the app routes to the right experience on open.
api.get('/context', async (c) => {
  return c.json<ContextResponse>({
    type: 'context',
    kind: await postKind(),
    isMod: await isCurrentUserMod(),
  });
});

api.route('/', community);
api.route('/solo', solo);
api.route('/request-mod', modrequest);
