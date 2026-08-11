/**
 * Light LinkedIn-style boolean helpers for the ZPC search bar.
 * Backend still receives a cleaned keyword string; client applies exclude/OR refinements where needed.
 */

export type ParsedSearchQuery = {
  /** Text sent to APIs (phrases joined, operators stripped). */
  apiQuery: string;
  /** Exact phrases from "quoted text". */
  phrases: string[];
  /** Terms that must NOT appear (from -term). */
  excludes: string[];
  /** OR groups — if non-empty, result should match at least one group term. */
  orTerms: string[];
};

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const input = String(raw || '').trim();
  if (!input) {
    return { apiQuery: '', phrases: [], excludes: [], orTerms: [] };
  }

  const phrases: string[] = [];
  let working = input.replace(/"([^"]+)"/g, (_, phrase: string) => {
    phrases.push(phrase.trim());
    return ' ';
  });

  const excludes: string[] = [];
  working = working.replace(/(?:^|\s)-([^\s)"]+)/g, (_, term: string) => {
    excludes.push(term);
    return ' ';
  });

  // Uppercase boolean operators (LinkedIn-style); strip them from API query.
  working = working.replace(/\b(AND|NOT)\b/g, ' ');

  const orTerms: string[] = [];
  if (/\bOR\b/.test(working)) {
    working
      .split(/\bOR\b/)
      .map((p) => p.replace(/[()]/g, ' ').trim())
      .filter(Boolean)
      .forEach((part) => orTerms.push(part));
    working = orTerms.join(' ');
  }

  working = working.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const apiQuery = [...phrases, working].filter(Boolean).join(' ').trim();

  return { apiQuery, phrases, excludes, orTerms };
}

/** Client-side refine: require phrases, honor OR groups and -excludes, AND plain tokens. */
export function matchesParsedQuery(haystack: string, parsed: ParsedSearchQuery): boolean {
  const text = String(haystack || '').toLowerCase();
  if (!text) return false;

  for (const phrase of parsed.phrases) {
    if (!text.includes(phrase.toLowerCase())) return false;
  }
  for (const ex of parsed.excludes) {
    if (text.includes(ex.toLowerCase())) return false;
  }
  if (parsed.orTerms.length > 0) {
    const hit = parsed.orTerms.some((t) => text.includes(t.toLowerCase()));
    if (!hit) return false;
    return true;
  }

  // Plain keyword / multi-word: every 2+ char token must appear as substring
  const tokens = String(parsed.apiQuery || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (tokens.length > 0) {
    return tokens.every((t) => text.includes(t));
  }
  const q = String(parsed.apiQuery || '').toLowerCase().trim();
  if (q.length === 1) return text.includes(q);
  return true;
}
