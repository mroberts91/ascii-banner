import { memo } from 'preact/compat';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { colorize } from '../color/color';
import { formatBanner } from '../export/formats';
import { isFontLoaded, loadFont, textSync } from '../fonts/loader';
import { renderBanner } from '../render/render';
import { exceedsWidth, maxLineWidth } from '../render/width';
import { useNearViewport } from '../hooks';
import { copyText } from '../clipboard';
import { SettingsContext } from '../settings';

interface Rendered {
  key: string;
  lines: string[];
}

export const FontCard = memo(function FontCard({ font }: { font: string }) {
  const settings = useContext(SettingsContext)!;
  const { text, width, spacing, color, format, favorites } = settings;
  const ref = useRef<HTMLElement>(null);
  const near = useNearViewport(ref);
  const [loaded, setLoaded] = useState(() => isFontLoaded(font));
  const [error, setError] = useState(false);
  const [rendered, setRendered] = useState<Rendered | null>(null);

  useEffect(() => {
    if (!near || loaded) return;
    let cancelled = false;
    loadFont(font).then(
      () => !cancelled && setLoaded(true),
      () => !cancelled && setError(true),
    );
    return () => {
      cancelled = true;
    };
  }, [near, loaded, font]);

  // Re-render only while near the viewport; off-screen cards keep stale output until seen again.
  const key = `${text}\u0000${width}\u0000${spacing}`;
  useEffect(() => {
    if (!near || !loaded || rendered?.key === key) return;
    try {
      setRendered({ key, lines: renderBanner(textSync, text, { font, width, spacing }) });
    } catch {
      setError(true);
    }
  }, [near, loaded, key, rendered, font, text, width, spacing]);

  const lines = rendered?.lines ?? null;
  const tooWide = lines ? exceedsWidth(lines, width) : false;
  const isFav = favorites.has(font);

  const copy = async () => {
    if (!lines) return;
    settings.onCopied(font, await copyText(formatBanner(format, lines, color)));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      void copy();
    }
  };

  return (
    <article
      ref={ref}
      class="card"
      tabIndex={0}
      aria-label={`${font} preview. Press Enter to copy.`}
      onKeyDown={onKeyDown}
      data-font={font}
    >
      <header class="card-head">
        <h3 class="card-title">{font}</h3>
        {tooWide && lines && (
          <span class="badge" title={`Widest line is ${maxLineWidth(lines)} columns`}>
            exceeds {width} cols
          </span>
        )}
        <button
          type="button"
          class={`icon-btn star${isFav ? ' on' : ''}`}
          aria-pressed={isFav}
          aria-label={isFav ? `Remove ${font} from favorites` : `Add ${font} to favorites`}
          onClick={() => settings.toggleFavorite(font)}
        >
          {isFav ? '★' : '☆'}
        </button>
        <button type="button" class="btn copy" disabled={!lines} onClick={copy}>
          Copy
        </button>
      </header>
      <div class={`art${color === 'mono' ? '' : ' art-color'}`}>
        {error ? (
          <p class="muted">This font couldn't render that text.</p>
        ) : lines ? (
          <pre aria-label={`${text} in ${font}`}>{renderArt(lines, color)}</pre>
        ) : (
          <div class="skeleton" aria-hidden="true" />
        )}
      </div>
    </article>
  );
});

function renderArt(lines: string[], color: string) {
  if (color === 'mono') return lines.join('\n');
  return colorize(lines, color).map((segs, i) => (
    <>
      {i > 0 && '\n'}
      {segs.map((s) => (s.color ? <span style={{ color: s.color }}>{s.text}</span> : s.text))}
    </>
  ));
}
