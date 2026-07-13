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
      // Enough headroom for the largest reply (a world bible); turn narration
      // is a fraction of this. Kept modest so a runaway reply can't stall a turn.
      maxOutputTokens: 2048,
      // gemini-2.5-flash enables "thinking" by default and counts those tokens
      // against the output budget, which can starve the actual reply. We don't
      // need reasoning for short narration, so turn it off.
      thinkingConfig: { thinkingBudget: 0 },
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
