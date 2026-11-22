import figlet from 'figlet';
import { describe, expect, it } from 'vitest';
import { normalizeLines, renderBanner } from '../../src/render/render';
import { exceedsWidth, maxLineWidth } from '../../src/render/width';
import { WIDTHS } from '../../src/render/options';

const textSync = figlet.textSync.bind(figlet);

describe('normalizeLines', () => {
  it('drops surrounding blank lines and trailing spaces', () => {
    expect(normalizeLines('\n  \nab  \n c\n\n')).toEqual(['ab', ' c']);
  });
});

describe('width handling', () => {
  it('measures the widest line', () => {
    expect(maxLineWidth(['a', 'abc', 'ab'])).toBe(3);
    expect(exceedsWidth(['abc'], 2)).toBe(true);
    expect(exceedsWidth(['abc'], 3)).toBe(false);
  });

  for (const width of WIDTHS) {
    it(`wraps long text to fit ${width} columns in Standard`, () => {
      const lines = renderBanner(textSync, 'The quick brown fox jumps over the dog', {
        font: 'Standard',
        width,
        spacing: 'default',
      });
      expect(maxLineWidth(lines)).toBeLessThanOrEqual(width);
      expect(lines.length).toBeGreaterThan(6); // wrapped onto more than one row of glyphs
    });
  }

  it('flags output that still exceeds the width (oversized glyphs)', () => {
    // figlet wraps per character, so only a single glyph wider than the target can overflow.
    const lines = renderBanner(textSync, 'W', { font: 'Doh', width: 30, spacing: 'default' });
    expect(maxLineWidth(lines)).toBeGreaterThan(30);
    expect(exceedsWidth(lines, 30)).toBe(true);
  });
});

describe('spacing', () => {
  it('full width is never narrower than fitted', () => {
    const opts = { font: 'Standard', width: 120 } as const;
    const full = renderBanner(textSync, 'Hello', { ...opts, spacing: 'full' });
    const fitted = renderBanner(textSync, 'Hello', { ...opts, spacing: 'fitted' });
    const def = renderBanner(textSync, 'Hello', { ...opts, spacing: 'default' });
    expect(maxLineWidth(full)).toBeGreaterThan(maxLineWidth(fitted));
    expect(maxLineWidth(fitted)).toBeGreaterThanOrEqual(maxLineWidth(def));
  });
});
