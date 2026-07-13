// Small coercers shared by everything that turns untrusted data — AI replies or
// older stored records — into safe, well-formed values.

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export function cleanString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

// Keeps only non-empty, de-duplicated strings, capped to a maximum; an empty
// result falls back so a list is never left blank unless the fallback is empty.
export function cleanStringList(
  value: unknown,
  fallback: string[],
  cap: number
): string[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= cap) break;
  }
  return out.length > 0 ? out : fallback;
}
