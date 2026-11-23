import { isColorSpec, type ColorSpec } from '../color/color';
import { isFormat, type Format } from '../export/formats';
import { sanitize } from '../input/sanitize';
import { isSpacing, isWidth, type Spacing, type TargetWidth } from '../render/options';

export const SORTS = ['featured', 'az'] as const;
export type Sort = (typeof SORTS)[number];

export interface ViewState {
  text: string;
  width: TargetWidth;
  spacing: Spacing;
  format: Format;
  color: ColorSpec;
  query: string;
  category: string;
  sort: Sort;
}

export const DEFAULT_STATE: ViewState = {
  text: '',
  width: 80,
  spacing: 'default',
  format: 'raw',
  color: 'mono',
  query: '',
  category: 'all',
  sort: 'featured',
};

/** Parse and validate a query string; anything invalid falls back to the default. */
export function parseQuery(search: string, categories: readonly string[] = []): ViewState {
  const p = new URLSearchParams(search);
  const s: ViewState = { ...DEFAULT_STATE };
  const t = p.get('t');
  if (t !== null) s.text = sanitize(t);
  const w = p.get('w');
  if (isWidth(w)) s.width = Number(w) as TargetWidth;
  const sp = p.get('s');
  if (isSpacing(sp)) s.spacing = sp;
  const f = p.get('f');
  if (isFormat(f)) s.format = f;
  const c = p.get('c');
  if (c !== null && isColorSpec(c)) s.color = c;
  const q = p.get('q');
  if (q !== null) s.query = sanitize(q);
  const cat = p.get('cat');
  if (cat !== null && categories.includes(cat)) s.category = cat;
  const sort = p.get('sort');
  if (SORTS.includes(sort as Sort)) s.sort = sort as Sort;
  return s;
}

/** Serialize only the values that differ from the defaults. */
export function toQuery(s: ViewState): string {
  const p = new URLSearchParams();
  if (s.text) p.set('t', s.text);
  if (s.width !== DEFAULT_STATE.width) p.set('w', String(s.width));
  if (s.spacing !== DEFAULT_STATE.spacing) p.set('s', s.spacing);
  if (s.format !== DEFAULT_STATE.format) p.set('f', s.format);
  if (s.color !== DEFAULT_STATE.color) p.set('c', s.color);
  if (s.query) p.set('q', s.query);
  if (s.category !== DEFAULT_STATE.category) p.set('cat', s.category);
  if (s.sort !== DEFAULT_STATE.sort) p.set('sort', s.sort);
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}
