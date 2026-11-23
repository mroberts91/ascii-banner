import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DEFAULT_CUSTOM_COLOR, GRADIENTS, isHexColor } from './color/color';
import { FORMAT_LABELS, FORMATS, type Format } from './export/formats';
import { CATEGORIES, CATEGORY_IDS, listFonts } from './fonts/catalog';
import { FONT_NAMES } from './fonts/loader';
import { displayText, MAX_INPUT_LENGTH, PLACEHOLDER_TEXT, sanitize } from './input/sanitize';
import { SPACING_LABELS, SPACINGS, WIDTHS } from './render/options';
import { asStringArray, KEYS, pushHistory, readJson, writeJson } from './state/storage';
import { DEFAULT_STATE, parseQuery, toQuery, type ViewState } from './state/url';
import { applyTheme, readTheme, THEMES, type Theme } from './theme';
import { useDebounced } from './hooks';
import { copyText } from './clipboard';
import { SettingsContext, type CardSettings } from './settings';
import { Gallery } from './components/Gallery';
import { Segmented } from './components/Segmented';
import { Toast } from './components/Toast';
import { ExternalLink } from './components/ExternalLink';
import flagUrl from './assets/us-flag-small.svg';

const THEME_LABELS: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' };
// U+FE0E asks for the text (not emoji) presentation of the glyph.
const THEME_ICONS: Record<Theme, string> = { light: '\u2600\uFE0E', dark: '\u263E\uFE0E', system: '\u25D0' };

export function App() {
  const [state, setState] = useState<ViewState>(() => parseQuery(window.location.search, CATEGORY_IDS));
  const set = <K extends keyof ViewState>(key: K, value: ViewState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => applyTheme(theme), [theme]);

  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(asStringArray(readJson(KEYS.favorites, []))),
  );
  const toggleFavorite = useCallback((font: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(font)) next.delete(font);
      else next.add(font);
      writeJson(KEYS.favorites, [...next]);
      return next;
    });
  }, []);

  const [history, setHistory] = useState<string[]>(() => asStringArray(readJson(KEYS.history, [])));
  const updateHistory = (next: string[]) => {
    setHistory(next);
    writeJson(KEYS.history, next);
  };
  const textRef = useRef(state.text);
  textRef.current = state.text;
  const remember = useCallback(() => {
    setHistory((prev) => {
      const next = pushHistory(prev, textRef.current);
      writeJson(KEYS.history, next);
      return next;
    });
  }, []);

  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);
  const onCopied = useCallback(
    (font: string, ok: boolean) => {
      notify(ok ? `Copied ${font}` : 'Copy failed. Your browser blocked clipboard access.');
      if (ok) remember();
    },
    [notify, remember],
  );

  // Keep the URL shareable without spamming history entries.
  const debouncedState = useDebounced(state, 250);
  useEffect(() => {
    const url = `${window.location.pathname}${toQuery(debouncedState)}`;
    window.history.replaceState(null, '', url);
  }, [debouncedState]);

  const renderText = useDebounced(displayText(state.text), 100);
  const fonts = useMemo(
    () => listFonts(FONT_NAMES, { query: state.query, category: state.category, sort: state.sort, favorites }),
    [state.query, state.category, state.sort, favorites],
  );

  const settings = useMemo<CardSettings>(
    () => ({
      text: renderText,
      width: state.width,
      spacing: state.spacing,
      format: state.format,
      color: state.color,
      favorites,
      toggleFavorite,
      onCopied,
    }),
    [renderText, state.width, state.spacing, state.format, state.color, favorites, toggleFavorite, onCopied],
  );

  const isCustom = isHexColor(state.color);
  const [customColor, setCustomColor] = useState(isCustom ? state.color : DEFAULT_CUSTOM_COLOR);
  const colorMode = isCustom ? 'custom' : state.color;

  const copyLink = async () => {
    const ok = await copyText(`${window.location.origin}${window.location.pathname}${toQuery(state)}`);
    notify(ok ? 'Link copied' : 'Copy failed');
  };

  // Resets the text and every option to defaults; favorites, history and theme are kept.
  const isDefault = toQuery(state) === '';
  // Options panel is collapsible on narrow screens; the badge counts options changed from defaults.
  const [optionsOpen, setOptionsOpen] = useState(false);
  const changedOptions = (Object.keys(DEFAULT_STATE) as (keyof ViewState)[]).filter(
    (k) => k !== 'text' && state[k] !== DEFAULT_STATE[k],
  ).length;
  const reset = () => {
    setState(DEFAULT_STATE);
    setCustomColor(DEFAULT_CUSTOM_COLOR);
    window.history.replaceState(null, '', window.location.pathname);
    document.getElementById('text')?.focus();
    notify('Reset to defaults');
  };

  return (
    <SettingsContext.Provider value={settings}>
      <a class="skip" href="#gallery">
        Skip to fonts
      </a>
      <header class="site-head">
        <div class="brand">
          <a class="home-link" href="/" title="Start over">
            <img class="brand-mark" src={flagUrl} alt="" width={45} height={24} />
            <h1>ASCII Banner</h1>
          </a>
        </div>
        <Segmented
          name="theme"
          label="Theme"
          hideLegend
          class="theme-toggle"
          value={theme}
          options={THEMES.map((t) => ({ value: t, label: THEME_LABELS[t], icon: THEME_ICONS[t] }))}
          onChange={setTheme}
        />
      </header>

      <main>
        <section class="compose" aria-label="Banner text">
          <div class="field grow">
            <label for="text">Your text</label>
            <div class="input-row">
              <input
                id="text"
                type="text"
                autoComplete="off"
                spellcheck={false}
                maxLength={MAX_INPUT_LENGTH}
                placeholder={PLACEHOLDER_TEXT}
                value={state.text}
                onInput={(e) => set('text', sanitize(e.currentTarget.value))}
                onBlur={remember}
              />
              <span class="counter" aria-live="off">
                {state.text.length}/{MAX_INPUT_LENGTH}
              </span>
              <button
                type="button"
                class="btn ghost options-toggle"
                aria-expanded={optionsOpen}
                aria-controls="options"
                onClick={() => setOptionsOpen((o) => !o)}
              >
                Options
                {changedOptions > 0 && (
                  <span class="count">
                    {changedOptions}
                    <span class="visually-hidden"> changed</span>
                  </span>
                )}
              </button>
            </div>
            {history.length > 0 && (
              <div class="history" role="group" aria-label="Recent text">
                <span class="muted">Recent</span>
                {history.map((h) => (
                  <span class="chip" key={h}>
                    <button type="button" class="chip-main" onClick={() => set('text', h)}>
                      {h}
                    </button>
                    <button
                      type="button"
                      class="chip-x"
                      aria-label={`Remove "${h}" from history`}
                      onClick={() => updateHistory(history.filter((x) => x !== h))}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button type="button" class="link" onClick={() => updateHistory([])}>
                  Clear all
                </button>
              </div>
            )}
          </div>
        </section>

        <section
          id="options"
          class={`controls${optionsOpen ? ' open' : ''}`}
          aria-label="Banner options"
        >
          <div class="row">
            <Segmented
              class="fill"
              name="width"
              label="Target width"
              value={state.width}
              options={WIDTHS.map((w) => ({ value: w, label: `${w}` }))}
              onChange={(v) => set('width', v)}
            />
            <Segmented
              class="fill"
              name="spacing"
              label="Letter spacing"
              value={state.spacing}
              options={SPACINGS.map((s) => ({ value: s, label: SPACING_LABELS[s] }))}
              onChange={(v) => set('spacing', v)}
            />
          </div>

          <div class="row selects">
            <div class="field">
              <label for="format">Copy as</label>
              <select
                id="format"
                value={state.format}
                onChange={(e) => set('format', e.currentTarget.value as Format)}
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
            <div class="field">
              <label for="color">Color</label>
              <div class="input-row">
                <select
                  id="color"
                  value={colorMode}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    set('color', v === 'custom' ? customColor : v);
                  }}
                >
                  <option value="mono">Mono</option>
                  {GRADIENTS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                  <option value="custom">Custom…</option>
                </select>
                {isCustom && (
                  <input
                    type="color"
                    aria-label="Custom color"
                    value={customColor}
                    onInput={(e) => {
                      const v = e.currentTarget.value.toUpperCase();
                      setCustomColor(v);
                      set('color', v);
                    }}
                  />
                )}
              </div>
            </div>
            <div class="field">
              <label for="sort">Sort</label>
              <select
                id="sort"
                value={state.sort}
                onChange={(e) => set('sort', e.currentTarget.value as ViewState['sort'])}
              >
                <option value="featured">Featured first</option>
                <option value="az">A–Z</option>
              </select>
            </div>
            <div class="field grow">
              <label for="search">Search fonts</label>
              <input
                id="search"
                type="search"
                autoComplete="off"
                placeholder="e.g. slant"
                value={state.query}
                onInput={(e) => set('query', sanitize(e.currentTarget.value))}
              />
            </div>
          </div>

          <div class="row between filters">
            <div class="chips" role="group" aria-label="Category">
              {[
                { id: 'all', label: 'All' },
                { id: 'favorites', label: `★ Favorites (${favorites.size})` },
                ...CATEGORIES,
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  class={`chip-toggle${state.category === c.id ? ' on' : ''}`}
                  aria-pressed={state.category === c.id}
                  onClick={() => set('category', c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div class="row tight actions">
              <span class="muted" aria-live="polite">
                {fonts.length} of {FONT_NAMES.length} fonts
              </span>
              <button type="button" class="btn ghost" onClick={reset} disabled={isDefault}>
                Reset
              </button>
              <button type="button" class="btn ghost" onClick={copyLink}>
                Copy link
              </button>
            </div>
          </div>
        </section>

        <div id="gallery" tabIndex={-1}>
          <Gallery fonts={fonts} />
        </div>
      </main>

      <footer class="site-foot">
        <p>
          Everything runs in your browser. Your text is never sent anywhere, and there are no cookies or
          analytics.
        </p>
        <p>
          Fonts come from <ExternalLink href="https://github.com/patorjk/figlet.js">figlet.js</ExternalLink>{' '}
          (MIT License). Each font keeps its author's credits and terms:{' '}
          <ExternalLink href="/font-licenses.txt">font licenses</ExternalLink>.
        </p>
        <p class="provenance">
          Built and maintained by an independent developer in Raleigh, North Carolina. Hosted on Cloudflare,
          a US company.
        </p>
      </footer>
      <Toast message={toast} />
    </SettingsContext.Provider>
  );
}
