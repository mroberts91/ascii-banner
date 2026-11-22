/** localStorage helpers that never throw (private mode, blocked storage, quota). */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

export const KEYS = {
  favorites: 'ab:favorites',
  history: 'ab:history',
  theme: 'ab:theme',
} as const;

export const HISTORY_LIMIT = 20;

/** Most-recent-first, de-duplicated, capped list. */
export function pushHistory(list: readonly string[], entry: string, limit = HISTORY_LIMIT): string[] {
  const value = entry.trim();
  if (!value) return [...list];
  return [value, ...list.filter((v) => v !== value)].slice(0, limit);
}

export function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
