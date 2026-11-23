import { KEYS, readJson, writeJson } from './state/storage';

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export function readTheme(): Theme {
  const t = readJson<unknown>(KEYS.theme, 'system');
  return THEMES.includes(t as Theme) ? (t as Theme) : 'system';
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  writeJson(KEYS.theme, theme);
}
