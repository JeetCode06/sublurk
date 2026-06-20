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
    console.error('Gemini API key is not set');
    return '';
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(buildGeminiRequest(systemPrompt, userPrompt)),
    });

    if (!response.ok) {
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
    console.error(`Gemini request failed: ${error}`);
    return '';
  }
}