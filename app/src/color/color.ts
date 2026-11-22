export type RGB = readonly [number, number, number];

export interface Gradient {
  id: string;
  label: string;
  stops: readonly string[];
  direction: 'horizontal' | 'vertical';
}

export const GRADIENTS: readonly Gradient[] = [
  { id: 'old-glory', label: 'Old Glory', stops: ['#B31942', '#FFFFFF', '#3C6CC4'], direction: 'horizontal' },
  { id: 'stripes', label: 'Stripes', stops: ['#E03A5C', '#FFFFFF', '#E03A5C', '#FFFFFF'], direction: 'vertical' },
  { id: 'sunset', label: 'Sunset', stops: ['#FF7E5F', '#FEB47B', '#FFD86F'], direction: 'horizontal' },
  { id: 'ocean', label: 'Ocean', stops: ['#00C6FF', '#0072FF'], direction: 'horizontal' },
  { id: 'forest', label: 'Forest', stops: ['#A8E063', '#2E9E4F'], direction: 'vertical' },
  { id: 'neon', label: 'Neon', stops: ['#FF00CC', '#7B2FF7', '#00E5FF'], direction: 'horizontal' },
];

/** 'mono' | gradient id | '#rrggbb' */
export type ColorSpec = string;
export const DEFAULT_CUSTOM_COLOR = '#3C6CC4';

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function isHexColor(v: string): boolean {
  return HEX_RE.test(v);
}

export function isColorSpec(v: unknown): v is ColorSpec {
  return typeof v === 'string' && (v === 'mono' || isHexColor(v) || GRADIENTS.some((g) => g.id === v));
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/** Sample a multi-stop gradient at t ∈ [0, 1]. */
export function sampleGradient(stops: readonly string[], t: number): RGB {
  if (stops.length === 1) return hexToRgb(stops[0]);
  const clamped = Math.min(1, Math.max(0, t));
  const pos = clamped * (stops.length - 1);
  const i = Math.min(Math.floor(pos), stops.length - 2);
  const f = pos - i;
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f)) as unknown as RGB;
}

/** A run of characters sharing one color (null = uncolored/whitespace). */
export interface Segment {
  text: string;
  color: string | null;
}

const STEPS = 32; // quantize so neighbouring columns share a color and spans merge

/** Split banner lines into colored runs according to the color spec. */
export function colorize(lines: readonly string[], spec: ColorSpec): Segment[][] {
  if (spec === 'mono') return lines.map((l) => [{ text: l, color: null }]);
  const gradient = GRADIENTS.find((g) => g.id === spec);
  const width = Math.max(1, ...lines.map((l) => l.length));
  const colorAt = (row: number, col: number): string => {
    if (!gradient) return spec.toUpperCase();
    const span = gradient.direction === 'horizontal' ? width - 1 : lines.length - 1;
    const idx = gradient.direction === 'horizontal' ? col : row;
    const t = span <= 0 ? 0 : Math.round((idx / span) * STEPS) / STEPS;
    return rgbToHex(sampleGradient(gradient.stops, t)).toUpperCase();
  };
  return lines.map((line, row) => {
    const segs: Segment[] = [];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const color = ch === ' ' ? null : colorAt(row, col);
      const last = segs[segs.length - 1];
      if (last && last.color === color) last.text += ch;
      else segs.push({ text: ch, color });
    }
    return segs;
  });
}
