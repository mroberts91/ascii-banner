import type { FigletOptions } from 'figlet';
import type { Spacing } from './options';

type TextSync = (text: string, options?: FigletOptions) => string;

/** Strip trailing whitespace per line and drop leading/trailing blank lines. */
export function normalizeLines(output: string): string[] {
  const lines = output.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === '') start++;
  while (end > start && lines[end - 1] === '') end--;
  return lines.slice(start, end);
}

export interface RenderOptions {
  font: string;
  width: number;
  spacing: Spacing;
}

/**
 * Render text with an already-loaded font. `textSync` is injected so the
 * browser build and Node tests can each pass their own figlet entry point.
 */
export function renderBanner(textSync: TextSync, text: string, opts: RenderOptions): string[] {
  const output = textSync(text, {
    font: opts.font,
    horizontalLayout: opts.spacing,
    width: opts.width,
    whitespaceBreak: true,
  });
  return normalizeLines(output);
}
