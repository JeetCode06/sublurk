type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export function buildGeminiRequest(systemPrompt: string, userPrompt: string) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 2048,
    },
  };
}

// Pulls the model's text out of a Gemini response, returning '' if the reply is
// empty or was blocked, so the caller can fall back to a safe result.
export function readGeminiText(data: unknown): string {
  if (typeof data !== 'object' || data === null) return '';
  const parts = (data as GeminiResponse).candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('');
}