import { createContext } from 'preact';
import type { ColorSpec } from './color/color';
import type { Format } from './export/formats';
import type { Spacing, TargetWidth } from './render/options';

export interface CardSettings {
  text: string;
  width: TargetWidth;
  spacing: Spacing;
  format: Format;
  color: ColorSpec;
  favorites: ReadonlySet<string>;
  toggleFavorite: (font: string) => void;
  onCopied: (font: string, ok: boolean) => void;
}

export const SettingsContext = createContext<CardSettings | null>(null);
