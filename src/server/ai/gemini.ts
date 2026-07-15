import { settings } from '@devvit/web/server';
import { buildGeminiRequest, readGeminiText } from './gemini-format';

const MODEL = 'gemini-flash-latest';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;

// Hot-path calls (turn resolution, room scenes, run intros) must not leave a
// player waiting on a stalled request, so they are bounded to this budget across
// all retries; when it runs out, the caller falls back to safe authored content.
const DEFAULT_TIMEOUT_MS = 10_000;

// World and map generation happen once per subreddit and are cached, and their
// replies run larger, so they get a longer budget — a stalled world-gen would
// otherwise degrade to a generic world rather than the community's own.
export const WORLD_GEN_TIMEOUT_MS = 25_000;

// Server errors (5xx) are brief blips worth retrying. Rate limits are NOT:
// retrying HTTP 429 within the same window only deepens the limit, so it falls
// straight through to authored fallback content and lets the quota recover.
function isRetriableStatus(status: number): boolean {
  return status >= 500;
}

// The outbound request can also be throttled by the platform before it ever
// reaches Gemini, surfacing as a thrown error rather than a status. Retrying that
// compounds the throttle just as badly, so it is treated the same as a 429.
function looksRateLimited(error: unknown): boolean {
  const message = String(error).toLowerCase();
  return (
    message.includes('too many requests') ||
    message.includes('rate limit') ||
    message.includes('429')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Calls Gemini for narration or world generation. Every attempt shares one
// overall deadline so a hung request can't stall the turn: once the budget is
// spent the loop stops retrying. Returns '' on unrecoverable failure so the
// parser produces safe authored fallback content.
export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string> {
  const apiKey = await settings.get('gemini-api-key');
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    console.error('Gemini API key is not set');
    return '';
  }

  const body = JSON.stringify(buildGeminiRequest(systemPrompt, userPrompt));
  const deadline = Date.now() + timeoutMs;
  // Only retry while enough of the budget remains to make another attempt worth
  // it, so total wait stays within the deadline.
  const canRetryWithin = (attempt: number): boolean =>
    attempt < MAX_ATTEMPTS && deadline - Date.now() > BASE_BACKOFF_MS;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      console.error('Gemini request exceeded its time budget');
      return '';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        if (isRetriableStatus(response.status) && canRetryWithin(attempt)) {
          console.error(
            `Gemini returned HTTP ${response.status}; retrying (${attempt}/${MAX_ATTEMPTS})`
          );
          await delay(BASE_BACKOFF_MS * 2 ** (attempt - 1));
          continue;
        }
        // A rate limit (429) is not retried: hammering it only prolongs the
        // throttle. Fall through to the authored fallback instead.
        console.error(
          response.status === 429
            ? 'Gemini rate limit reached (HTTP 429); using fallback'
            : `Gemini returned HTTP ${response.status}`
        );
        return '';
      }

      const data: unknown = await response.json();
      const text = readGeminiText(data);
      if (text.length === 0) {
        console.error(
          `Gemini returned no usable text: ${JSON.stringify(data).slice(0, 600)}`
        );
      }
      return text;
    } catch (error) {
      // A throttled outbound request must not be retried — that only compounds
      // the limit. Genuine transient failures (network blips, aborts) still get
      // another attempt within the budget.
      if (!looksRateLimited(error) && canRetryWithin(attempt)) {
        console.error(
          `Gemini request failed: ${error}; retrying (${attempt}/${MAX_ATTEMPTS})`
        );
        await delay(BASE_BACKOFF_MS * 2 ** (attempt - 1));
        continue;
      }
      console.error(`Gemini request failed: ${error}`);
      return '';
    } finally {
      clearTimeout(timer);
    }
  }
  return '';
}
