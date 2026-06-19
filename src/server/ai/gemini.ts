import { settings } from '@devvit/web/server';
import { buildGeminiRequest, readGeminiText } from './gemini-format';

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Calls Gemini for a turn's narration. Returns '' on any failure (missing key,
// network error, blocked reply) so the parser produces a safe fallback result.
export async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = await settings.get('gemini-api-key');
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    return '';
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(buildGeminiRequest(systemPrompt, userPrompt)),
  });

  if (!response.ok) return '';

  const data: unknown = await response.json();
  return readGeminiText(data);
}