import { colorize, hexToRgb, type ColorSpec } from '../color/color';

export const FORMATS = ['raw', 'ansi', 'markdown', 'c', 'hash', 'html'] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<Format, string> = {
  raw: 'Plain text',
  ansi: 'ANSI truecolor',
  markdown: 'Markdown code block',
  c: 'C-style /* */ comment',
  hash: 'Hash # comment',
  html: 'HTML/XML <!-- --> comment',
};

export function isFormat(v: unknown): v is Format {
  return FORMATS.includes(v as Format);
}

const trimEnd = (l: string) => l.replace(/\s+$/, '');

export function toRaw(lines: readonly string[]): string {
  return lines.map(trimEnd).join('\n');
}

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

/**
 * ANSI 24-bit color. 'mono' emits bold text in the terminal's default color
 * so the output stays readable on both light and dark terminals.
 */
export function toAnsi(lines: readonly string[], color: ColorSpec = 'mono'): string {
  const trimmed = lines.map(trimEnd);
  if (color === 'mono') return trimmed.map((l) => (l ? `${ESC}1m${l}${RESET}` : l)).join('\n');
  return colorize(trimmed, color)
    .map((segs) => {
      let out = '';
      let current: string | null = null;
      for (const s of segs) {
        if (s.color && s.color !== current) {
          const [r, g, b] = hexToRgb(s.color);
          out += `${ESC}38;2;${r};${g};${b}m`;
          current = s.color;
        }
        out += s.text;
      }
      return current ? out + RESET : out;
    })
    .join('\n');
}

export function toMarkdown(lines: readonly string[]): string {
  const body = toRaw(lines);
  const longestRun = Math.max(0, ...(body.match(/`+/g) ?? []).map((r) => r.length));
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${body}\n${fence}`;
}

export function toCComment(lines: readonly string[]): string {
  const body = lines.map((l) => trimEnd(` * ${l.replace(/\*\//g, '* /')}`));
  return ['/*', ...body, ' */'].join('\n');
}

export function toHashComment(lines: readonly string[]): string {
  return lines.map((l) => trimEnd(`# ${l}`)).join('\n');
}

export function toHtmlComment(lines: readonly string[]): string {
  // "--" is not allowed inside an HTML/XML comment; repeat until no pair remains.
  const escape = (l: string) => {
    let out = l;
    while (out.includes('--')) out = out.replace(/--/g, '- -');
    return out;
  };
  const body = lines.map((l) => trimEnd(`  ${escape(l)}`));
  return ['<!--', ...body, '-->'].join('\n');
}

export function formatBanner(format: Format, lines: readonly string[], color: ColorSpec = 'mono'): string {
  switch (format) {
    case 'raw':
      return toRaw(lines);
    case 'ansi':
      return toAnsi(lines, color);
    case 'markdown':
      return toMarkdown(lines);
    case 'c':
      return toCComment(lines);
    case 'hash':
      return toHashComment(lines);
    case 'html':
      return toHtmlComment(lines);
  }
}
