export type MentionPerson = {
  id: string;
  name: string;
  subtitle?: string;
  photoUrl?: string | null;
};

export type MentionProperty = {
  id: string;
  title: string;
  subtitle?: string;
};

export type MentionItem =
  | { kind: 'person'; person: MentionPerson }
  | { kind: 'property'; property: MentionProperty };

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const MENTION_STOPWORDS = new Set([
  'a', 'an', 'the', 'my', 'our', 'of', 'in', 'on', 'to', 'for', 'and', 'or', 'at', 'by',
]);

function significantTokens(query: string): string[] {
  return query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !MENTION_STOPWORDS.has(token));
}

/** Higher is better. Prefix and leading letters rank above loose substring. */
export function mentionMatchScore(haystack: string, query: string): number {
  const text = (haystack || '').trim().toLowerCase();
  const q = (query || '').trim().toLowerCase();
  if (!q || !text) return 0;
  if (text === q) return 100;
  if (text.startsWith(q)) return 92;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.some((word) => word.startsWith(q))) return 84;
  const compactText = compact(text);
  const compactQuery = compact(q);
  if (compactQuery && compactText.startsWith(compactQuery)) return 78;
  const initials = words.map((word) => word[0] || '').join('');
  if (compactQuery && initials.startsWith(compactQuery)) return 72;
  if (text.includes(q)) return 64;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => text.includes(token))) return 58;
  const meaningful = significantTokens(q);
  if (meaningful.length && meaningful.every((token) => text.includes(token))) return 56;
  if (compactQuery && compactText.includes(compactQuery)) return 50;
  return 0;
}

export function rankMentionPeople(people: MentionPerson[], query: string): MentionPerson[] {
  return [...people]
    .map((person) => ({
      person,
      score: Math.max(
        mentionMatchScore(person.name, query),
        mentionMatchScore(person.subtitle || '', query),
      ),
    }))
    .filter((row) => !query.trim() || row.score > 0)
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name))
    .map((row) => row.person);
}

export function rankMentionProperties(properties: MentionProperty[], query: string): MentionProperty[] {
  return [...properties]
    .map((property) => ({
      property,
      score: Math.max(
        mentionMatchScore(property.title, query),
        mentionMatchScore(property.subtitle || '', query),
      ),
    }))
    .filter((row) => !query.trim() || row.score > 0)
    .sort((a, b) => b.score - a.score || a.property.title.localeCompare(b.property.title))
    .map((row) => row.property);
}

export function flattenMentionItems(
  people: MentionPerson[],
  properties: MentionProperty[],
): MentionItem[] {
  return [
    ...people.map((person) => ({ kind: 'person' as const, person })),
    ...properties.map((property) => ({ kind: 'property' as const, property })),
  ];
}

export function highlightMentionMatch(text: string, query: string): Array<{ text: string; hit: boolean }> {
  const source = text || '';
  const q = (query || '').trim();
  if (!q) return [{ text: source, hit: false }];
  const lower = source.toLowerCase();
  const needle = q.toLowerCase();
  const index = lower.indexOf(needle);
  if (index < 0) return [{ text: source, hit: false }];
  return [
    { text: source.slice(0, index), hit: false },
    { text: source.slice(index, index + q.length), hit: true },
    { text: source.slice(index + q.length), hit: false },
  ].filter((part) => part.text);
}
