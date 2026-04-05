import type { HelpIndexEntry } from "@/components/help/helpIndex";

export interface HelpSearchResult {
  entry: HelpIndexEntry;
  score: number;
}

/**
 * Simple substring + token match search over the help index.
 * Returns results sorted by score (higher = better match), up to `limit`.
 * Empty or whitespace query returns [].
 */
export function searchHelp(
  query: string,
  index: HelpIndexEntry[],
  limit = 12,
): HelpSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const results: HelpSearchResult[] = [];

  for (const entry of index) {
    const score = scoreEntry(entry, q, tokens);
    if (score > 0) results.push({ entry, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function scoreEntry(
  entry: HelpIndexEntry,
  query: string,
  tokens: string[],
): number {
  const heading = entry.heading.toLowerCase();
  const body = entry.body.toLowerCase();
  const keywords = entry.keywords.map((k) => k.toLowerCase());

  let score = 0;

  // Strong signal: exact keyword match
  for (const kw of keywords) {
    if (kw === query) score += 20;
    else if (kw.includes(query)) score += 10;
  }

  // Strong signal: heading contains full query
  if (heading.includes(query)) score += 15;

  // Per-token scoring
  for (const t of tokens) {
    // Keyword token hit
    for (const kw of keywords) {
      if (kw === t) {
        score += 8;
        break;
      } else if (kw.includes(t)) {
        score += 4;
        break;
      }
    }

    // Heading token hit
    if (heading.includes(t)) score += 5;

    // Body token hit
    if (body.includes(t)) score += 2;
  }

  return score;
}

/** Highlight matched substrings for result preview. Returns array of
 *  `{ text, matched }` segments so the caller can render with styling. */
export function highlightMatch(
  text: string,
  query: string,
): { text: string; matched: boolean }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [{ text, matched: false }];

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [{ text, matched: false }];

  // Find all match ranges
  const ranges: [number, number][] = [];
  const lower = text.toLowerCase();
  for (const t of tokens) {
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(t, from);
      if (idx === -1) break;
      ranges.push([idx, idx + t.length]);
      from = idx + t.length;
    }
  }
  if (ranges.length === 0) return [{ text, matched: false }];

  // Merge overlapping ranges
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }

  // Build segments
  const segments: { text: string; matched: boolean }[] = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) segments.push({ text: text.slice(pos, s), matched: false });
    segments.push({ text: text.slice(s, e), matched: true });
    pos = e;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), matched: false });

  return segments;
}
