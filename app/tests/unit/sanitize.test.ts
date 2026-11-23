import { describe, expect, it } from 'vitest';
import { displayText, MAX_INPUT_LENGTH, sanitize } from '../../src/input/sanitize';

describe('sanitize', () => {
  it('keeps printable ASCII', () => {
    expect(sanitize('Hello, World! ~`{}')).toBe('Hello, World! ~`{}');
  });
  it('strips control, non-ASCII and emoji characters', () => {
    expect(sanitize('a\tb\ncéd😀e\u007f')).toBe('abcde');
  });
  it(`caps at ${MAX_INPUT_LENGTH} characters`, () => {
    expect(sanitize('x'.repeat(100))).toHaveLength(MAX_INPUT_LENGTH);
  });
});

describe('displayText', () => {
  it('falls back to Merica for empty or blank input', () => {
    expect(displayText('')).toBe('Merica');
    expect(displayText('   ')).toBe('Merica');
    expect(displayText('😀')).toBe('Merica');
  });
  it('returns sanitized input otherwise', () => {
    expect(displayText('Hi')).toBe('Hi');
  });
});
