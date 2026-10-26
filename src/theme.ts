import { createContext, useContext } from 'react';

export const SWATCHES = ['blue', 'teal', 'green', 'brass', 'orange', 'rose', 'violet', 'slate'] as const;
export type Swatch = (typeof SWATCHES)[number];
export const ACCENTS: Swatch[] = ['brass', 'blue', 'teal', 'green', 'rose', 'violet'];

const SW: Record<'light' | 'dark', Record<Swatch, string>> = {
  light: { brass: '#8E6A1F', blue: '#3550C8', teal: '#11817C', green: '#2F7A3A', orange: '#B4561E', rose: '#B13E6B', violet: '#6B48B5', slate: '#56607A' },
  dark: { brass: '#D9B45F', blue: '#8193FF', teal: '#3CC2BC', green: '#7BCB6E', orange: '#F0995C', rose: '#E57BA4', violet: '#A889E6', slate: '#9AA4BE' },
};

const BASE = {
  light: { bg: '#F4F5F8', surface: '#FFFFFF', sunk: '#F0F2F6', band: '#E9ECF2', ink: '#121625', muted: '#646B7F', line: '#E3E6ED', pos: '#1B8456', neg: '#B83D2B', other: '#A2A8B8', card: '#141A2E', card2: '#090C17', accentInk: '#FFFFFF' },
  dark: { bg: '#0A0D16', surface: '#131725', sunk: '#171C2C', band: '#1C2235', ink: '#ECEDF3', muted: '#9AA0B4', line: '#232939', pos: '#4CC48A', neg: '#F07C66', other: '#5E667D', card: '#1B2138', card2: '#10142A', accentInk: '#12131A' },
};

export type Mode = 'light' | 'dark';
export type Theme = (typeof BASE)['light'] & {
  mode: Mode;
  sw: Record<Swatch, string>;
  accent: string;
  cardInk: string;
  cardMuted: string;
  cardLine: string;
  cardCell: string;
  cardNeg: string;
};

export function makeTheme(mode: Mode, accent: Swatch): Theme {
  return {
    ...BASE[mode],
    mode,
    sw: SW[mode],
    accent: SW[mode][accent],
    cardInk: '#F3F0E8',
    cardMuted: '#9BA1B5',
    cardLine: 'rgba(255,255,255,0.09)',
    cardCell: 'rgba(9,12,23,0.35)',
    cardNeg: '#F2937F',
  };
}

/** Blend colour a into colour b; weight is the share of a (0–1). */
export function mix(a: string, b: string, weight: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v * weight + y[i] * (1 - weight)).toString(16).padStart(2, '0')).join('');
}

export const ThemeContext = createContext<Theme>(makeTheme('light', 'brass'));
export const useTheme = () => useContext(ThemeContext);
