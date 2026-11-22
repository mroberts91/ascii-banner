export const WIDTHS = [80, 100, 120] as const;
export type TargetWidth = (typeof WIDTHS)[number];

export const SPACINGS = ['default', 'fitted', 'full'] as const;
export type Spacing = (typeof SPACINGS)[number];

export const SPACING_LABELS: Record<Spacing, string> = {
  default: 'Font default',
  fitted: 'Fitted',
  full: 'Full width',
};

export function isWidth(v: unknown): v is TargetWidth {
  return WIDTHS.includes(Number(v) as TargetWidth);
}

export function isSpacing(v: unknown): v is Spacing {
  return SPACINGS.includes(v as Spacing);
}
