import { redis } from '@devvit/web/server';
import { EMPTY_RECORD, type ModRequestRecord } from '../core/modrequest';

// Per-user request history, keyed by user id so the spam limits follow the
// person rather than any one community.
const requestKey = (userId: string): string => `crawl:modreq:${userId}`;

// Coerces stored JSON into a valid record, tolerating older or malformed values
// by falling back to an empty history rather than throwing.
function coerceRecord(raw: string | undefined): ModRequestRecord {
  if (!raw) return EMPTY_RECORD;
  try {
    const value = JSON.parse(raw) as Partial<ModRequestRecord>;
    return {
      day: typeof value.day === 'string' ? value.day : '',
      countToday:
        typeof value.countToday === 'number' &&
        Number.isFinite(value.countToday)
          ? value.countToday
          : 0,
      subs: Array.isArray(value.subs)
        ? value.subs.filter((s): s is string => typeof s === 'string')
        : [],
    };
  } catch {
    return EMPTY_RECORD;
  }
}

export async function readModRequestRecord(
  userId: string
): Promise<ModRequestRecord> {
  return coerceRecord(await redis.get(requestKey(userId)));
}

export async function writeModRequestRecord(
  userId: string,
  record: ModRequestRecord
): Promise<void> {
  await redis.set(requestKey(userId), JSON.stringify(record));
}