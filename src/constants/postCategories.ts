/** Community post categories shown on Create Post. */
export type PostCategoryId =
  | 'buy-sell'
  | 'price-check'
  | 'investment'
  | 'discussion'
  | 'suggestion'
  | 'property-review'
  | 'market-update'
  | 'flag-area'
  | 'legal-docs'
  | 'loan-finance'
  | 'construction'
  | 'rent-rental'
  | 'locality-review'
  | 'create-poll';

export type PostCategory = {
  id: PostCategoryId;
  title: string;
  description: string;
};

export const POST_CATEGORIES: PostCategory[] = [
  { id: 'buy-sell', title: 'Buy / Sell', description: 'List or find properties' },
  { id: 'price-check', title: 'Price Check', description: 'Discuss property values' },
  { id: 'investment', title: 'Investment', description: 'Share opportunities' },
  { id: 'discussion', title: 'Discussion', description: 'Start a conversation' },
  { id: 'suggestion', title: 'Suggestion', description: 'Share property ideas' },
  { id: 'property-review', title: 'Property Review', description: 'Rate and review homes' },
  { id: 'market-update', title: 'Market Update', description: 'Share market trends' },
  { id: 'flag-area', title: 'Flag an Area', description: 'Report local issues' },
  { id: 'legal-docs', title: 'Legal / Docs', description: 'Verification queries' },
  { id: 'loan-finance', title: 'Loan / Finance', description: 'Discuss mortgages' },
  { id: 'construction', title: 'Construction', description: 'Build & renovate' },
  { id: 'rent-rental', title: 'Rent / Rental', description: 'Find or list rentals' },
  { id: 'locality-review', title: 'Locality Review', description: 'Discuss neighborhoods' },
  { id: 'create-poll', title: 'Create Poll', description: 'Ask the community' },
];

const LABEL_BY_KEY: Record<string, string> = {};
for (const category of POST_CATEGORIES) {
  LABEL_BY_KEY[category.id] = category.title;
  LABEL_BY_KEY[category.title] = category.title;
  LABEL_BY_KEY[category.title.toLowerCase()] = category.title;
}
LABEL_BY_KEY.poll = 'Poll';
LABEL_BY_KEY.review = 'Review';

const HIDDEN_FORMAT_TYPES = new Set(['TEXT', 'IMAGE', 'VIDEO', 'PROPERTY']);
const CATEGORY_TITLE_RE = /^\[([^\]]+)\]\s*/;

/** Map stored `propertyType` / slug to the label shown on the feed. */
export function postCategoryLabel(raw?: string | null): string {
  if (!raw) return '';
  const key = raw.trim();
  if (!key) return '';
  const mapped = LABEL_BY_KEY[key] || LABEL_BY_KEY[key.toLowerCase()];
  if (mapped) return mapped;
  if (HIDDEN_FORMAT_TYPES.has(key.toUpperCase())) return '';
  return key;
}

/** Values the post service CHECK constraint actually stores. */
export function toBackendPostType(categoryId: string): string {
  if (categoryId === 'create-poll') return 'POLL';
  if (categoryId === 'property-review' || categoryId === 'locality-review') return 'REVIEW';
  return 'TEXT';
}

export function withCategoryPrefix(categoryId: string, title: string): string {
  const category = POST_CATEGORIES.find((item) => item.id === categoryId);
  const cleaned = stripCategoryPrefix(title);
  if (!category) return cleaned;
  return `[${category.title}] ${cleaned}`;
}

export function stripCategoryPrefix(title: string): string {
  return (title || '').replace(CATEGORY_TITLE_RE, '').trim();
}

export function categoryFromTitle(title?: string | null): string {
  if (!title) return '';
  const match = title.match(CATEGORY_TITLE_RE);
  if (!match) return '';
  return postCategoryLabel(match[1]) || match[1];
}
