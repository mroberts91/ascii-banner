import data from './categories.json';

export interface Category {
  id: string;
  label: string;
}

export const CATEGORIES: readonly Category[] = Object.entries(data.categories).map(([id, c]) => ({
  id,
  label: c.label,
}));

export const CATEGORY_IDS: readonly string[] = ['all', 'favorites', ...CATEGORIES.map((c) => c.id)];

const membership = new Map<string, Set<string>>(
  Object.entries(data.categories).map(([id, c]) => [id, new Set(c.fonts)]),
);

export const FEATURED: readonly string[] = data.featured;
const featuredRank = new Map(FEATURED.map((f, i) => [f, i]));

export function inCategory(font: string, category: string): boolean {
  return membership.get(category)?.has(font) ?? false;
}

export interface ListOptions {
  query: string;
  category: string;
  sort: 'featured' | 'az';
  favorites: ReadonlySet<string>;
}

/** Filter by search + category, then order (favorites → featured → A–Z, or A–Z). */
export function listFonts(all: readonly string[], o: ListOptions): string[] {
  const q = o.query.trim().toLowerCase();
  const filtered = all.filter((name) => {
    if (q && !name.toLowerCase().includes(q)) return false;
    if (o.category === 'all') return true;
    if (o.category === 'favorites') return o.favorites.has(name);
    return inCategory(name, o.category);
  });
  if (o.sort === 'az') return filtered;
  const rank = (name: string) =>
    o.favorites.has(name) ? -1 : (featuredRank.get(name) ?? Number.POSITIVE_INFINITY);
  // Array.prototype.sort is stable, so ties keep A–Z order from `all`.
  return [...filtered].sort((a, b) => rank(a) - rank(b));
}
