import { describe, expect, it } from 'vitest';
import {
  formatBanner,
  FORMATS,
  toAnsi,
  toCComment,
  toHashComment,
  toHtmlComment,
  toMarkdown,
  toRaw,
} from '../../src/export/formats';

const art = [' _  _ ', '| || |', '|_||_|   '];

describe('raw', () => {
  it('joins lines and trims trailing whitespace', () => {
    expect(toRaw(art)).toBe(' _  _\n| || |\n|_||_|');
  });
});

describe('markdown', () => {
  it('wraps in a text code fence', () => {
    expect(toMarkdown(['ab'])).toBe('```text\nab\n```');
  });
  it('uses a fence longer than any backtick run in the art', () => {
    const out = toMarkdown(['a ``` b', '````']);
    expect(out.startsWith('`````text\n')).toBe(true);
    expect(out.endsWith('\n`````')).toBe(true);
  });
});

describe('C comment', () => {
  it('produces a block comment', () => {
    expect(toCComment(['ab', ''])).toBe('/*\n * ab\n *\n */');
  });
  it('escapes */ so the comment cannot close early', () => {
    const out = toCComment(['a*/b']);
    expect(out).toBe('/*\n * a* /b\n */');
    expect(out.slice(2, -2)).not.toContain('*/');
  });
});

describe('hash comment', () => {
  it('prefixes every line', () => {
    expect(toHashComment(['ab', ''])).toBe('# ab\n#');
  });
});

describe('HTML comment', () => {
  it('produces an HTML comment', () => {
    expect(toHtmlComment(['ab'])).toBe('<!--\n  ab\n-->');
  });
  it('never contains -- inside the body', () => {
    const out = toHtmlComment(['----', '-- x --', '---']);
    const body = out.slice('<!--'.length, -'-->'.length);
    expect(body).not.toContain('--');
  });
});

describe('ANSI', () => {
  it('mono uses bold + reset per non-empty line', () => {
    expect(toAnsi(['ab', ''], 'mono')).toBe('\x1b[1mab\x1b[0m\n');
  });
  it('custom color emits one truecolor code per line and resets', () => {
    expect(toAnsi(['a b'], '#FF0000')).toBe('\x1b[38;2;255;0;0ma b\x1b[0m');
  });
  it('gradient emits multiple colors and always resets', () => {
    const out = toAnsi(['#'.repeat(40)], 'old-glory');
    // eslint-disable-next-line no-control-regex -- matching ANSI escape codes
    const codes = out.match(/\x1b\[38;2;\d+;\d+;\d+m/g) ?? [];
    expect(codes.length).toBeGreaterThan(5);
    expect(out.startsWith('\x1b[38;2;179;25;66m')).toBe(true);
    expect(out.endsWith('\x1b[0m')).toBe(true);
  });
  it('leaves blank lines uncolored', () => {
    expect(toAnsi(['', '   '], '#00FF00')).toBe('\n');
  });
});

describe('formatBanner', () => {
  it('handles every format', () => {
    for (const f of FORMATS) expect(formatBanner(f, art).length).toBeGreaterThan(0);
  });
});
