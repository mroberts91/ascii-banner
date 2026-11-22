import figlet from 'figlet';

// One lazy chunk per bundled figlet.js font; nothing is pulled into the main bundle.
const modules = import.meta.glob<string>('/node_modules/figlet/importable-fonts/*.js', {
  import: 'default',
});

const byName = new Map<string, () => Promise<string>>();
for (const [path, load] of Object.entries(modules)) {
  const name = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1, -'.js'.length));
  byName.set(name, load);
}

export const FONT_NAMES: readonly string[] = [...byName.keys()].sort((a, b) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' }),
);

const loaded = new Set<string>();
const pending = new Map<string, Promise<void>>();

export function isFontLoaded(name: string): boolean {
  return loaded.has(name);
}

export function loadFont(name: string): Promise<void> {
  if (loaded.has(name)) return Promise.resolve();
  let p = pending.get(name);
  if (!p) {
    const load = byName.get(name);
    if (!load) return Promise.reject(new Error(`Unknown font: ${name}`));
    p = load().then((data) => {
      figlet.parseFont(name, data);
      loaded.add(name);
      pending.delete(name);
    });
    pending.set(name, p);
  }
  return p;
}

export const textSync = figlet.textSync.bind(figlet);
