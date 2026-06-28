import { settings } from '@devvit/web/server';
import { buildGeminiRequest, readGeminiText } from './gemini-format';

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;

// Gemini's flash models return transient 429/5xx errors under load; a short
// retry with backoff rides those out instead of dropping the player to a flat
// fallback scene. Other failures (bad key, blocked reply) are not worth
// retrying and fall straight through to a safe empty result.
function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Calls Gemini for a turn's narration. Returns '' on unrecoverable failure so
// the parser produces a safe fallback result.
export async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = await settings.get('gemini-api-key');
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    console.error('Gemini API key is not set');
    return '';
  }

  const body = JSON.stringify(buildGeminiRequest(systemPrompt, userPrompt));

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body,
      });

      if (!response.ok) {
        if (isTransient(response.status) && attempt < MAX_ATTEMPTS) {
          console.error(
            `Gemini returned HTTP ${response.status}; retrying (${attempt}/${MAX_ATTEMPTS})`
          );
          await delay(BASE_BACKOFF_MS * 2 ** (attempt - 1));
          continue;
        }
        console.error(`Gemini returned HTTP ${response.status}`);
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
      if (attempt < MAX_ATTEMPTS) {
        console.error(
          `Gemini request failed: ${error}; retrying (${attempt}/${MAX_ATTEMPTS})`
        );
        await delay(BASE_BACKOFF_MS * 2 ** (attempt - 1));
        continue;
      }
      console.error(`Gemini request failed: ${error}`);
      return '';
    }
  }
  return '';
}