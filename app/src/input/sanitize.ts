export const MAX_INPUT_LENGTH = 40;
export const PLACEHOLDER_TEXT = 'Merica';

/** Keep printable ASCII (0x20–0x7E) only and cap the length. */
export function sanitize(raw: string): string {
  let out = '';
  for (const ch of raw) {
    const code = ch.charCodeAt(0);
    if (ch.length === 1 && code >= 0x20 && code <= 0x7e) {
      out += ch;
      if (out.length >= MAX_INPUT_LENGTH) break;
    }
  }
  return out;
}

/** The text actually rendered: sanitized input, or the placeholder when blank. */
export function displayText(raw: string): string {
  const clean = sanitize(raw);
  return clean.trim() === '' ? PLACEHOLDER_TEXT : clean;
}
