import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { colorize, isColorSpec, sampleGradient } from '../../src/color/color';
import { CATEGORY_IDS, FEATURED, listFonts } from '../../src/fonts/catalog';
import data from '../../src/fonts/categories.json';
import { pushHistory } from '../../src/state/storage';
import { DEFAULT_STATE, parseQuery, toQuery, type ViewState } from '../../src/state/url';

const fontDir = fileURLToPath(new URL('../../node_modules/figlet/importable-fonts/', import.meta.url));
const allFonts = readdirSync(fontDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => f.slice(0, -3))
  .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

describe('URL state', () => {
  it('round-trips a full state', () => {
    const s: ViewState = {
      text: 'Hi there & <you>',
      width: 120,
      spacing: 'fitted',
      format: 'markdown',
      color: '#B31942',
      query: 'slant',
      category: 'script',
      sort: 'az',
    };
    expect(parseQuery(toQuery(s), CATEGORY_IDS)).toEqual(s);
  });
  it('omits defaults', () => {
    expect(toQuery(DEFAULT_STATE)).toBe('');
  });
  it('rejects invalid values', () => {
    const s = parseQuery('?w=999&s=wide&f=pdf&c=javascript:alert(1)&cat=nope&sort=x&t=%E2%9C%93ok', CATEGORY_IDS);
    expect(s).toEqual({ ...DEFAULT_STATE, text: 'ok' });
  });
});

describe('history', () => {
  it('dedupes, orders most recent first, and caps', () => {
    expect(pushHistory(['a', 'b'], 'b')).toEqual(['b', 'a']);
    expect(pushHistory(['a'], '  ')).toEqual(['a']);
    expect(pushHistory(['1', '2', '3'], '4', 3)).toEqual(['4', '1', '2']);
  });
});

describe('catalog', () => {
  it('only references fonts figlet.js bundles', () => {
    const known = new Set(allFonts);
    const referenced = [...data.featured, ...Object.values(data.categories).flatMap((c) => c.fonts)];
    expect(referenced.filter((f) => !known.has(f))).toEqual([]);
  });
  it('puts favorites first, then featured, then A–Z', () => {
    const out = listFonts(allFonts, { query: '', category: 'all', sort: 'featured', favorites: new Set(['Wavy']) });
    expect(out[0]).toBe('Wavy');
    expect(out.slice(1, 1 + FEATURED.length)).toEqual(FEATURED);
    expect(out).toHaveLength(allFonts.length);
  });
  it('filters by search and category', () => {
    const out = listFonts(allFonts, { query: 'slant', category: 'script', sort: 'az', favorites: new Set() });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((f) => f.toLowerCase().includes('slant'))).toBe(true);
  });
  it('favorites category shows only favorites', () => {
    const favs = new Set(['Standard', 'Big']);
    expect(listFonts(allFonts, { query: '', category: 'favorites', sort: 'az', favorites: favs })).toEqual([
      'Big',
      'Standard',
    ]);
  });
});

describe('color', () => {
  it('validates color specs', () => {
    expect(isColorSpec('mono')).toBe(true);
    expect(isColorSpec('old-glory')).toBe(true);
    expect(isColorSpec('#abcdef')).toBe(true);
    expect(isColorSpec('red')).toBe(false);
  });
  it('samples gradient endpoints exactly', () => {
    expect(sampleGradient(['#000000', '#FFFFFF'], 0)).toEqual([0, 0, 0]);
    expect(sampleGradient(['#000000', '#FFFFFF'], 1)).toEqual([255, 255, 255]);
  });
  it('merges same-colored runs and leaves spaces uncolored', () => {
    expect(colorize(['ab cd'], '#112233')).toEqual([
      [
        { text: 'ab', color: '#112233' },
        { text: ' ', color: null },
        { text: 'cd', color: '#112233' },
      ],
    ]);
  });
});
