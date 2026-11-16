import { createContext, useContext } from 'react';

export const SWATCHES = ['blue', 'teal', 'green', 'brass', 'orange', 'rose', 'violet', 'slate'] as const;
export type Swatch = (typeof SWATCHES)[number];
export const ACCENTS: Swatch[] = ['brass', 'blue', 'teal', 'green', 'orange', 'rose', 'violet'];

const SW: Record<'light' | 'dark', Record<Swatch, string>> = {
  light: { brass: '#8E6A1F', blue: '#3550C8', teal: '#11817C', green: '#2F7A3A', orange: '#B4561E', rose: '#B13E6B', violet: '#6B48B5', slate: '#56607A' },
  dark: { brass: '#D4A946', blue: '#8193FF', teal: '#3CC2BC', green: '#7BCB6E', orange: '#F0995C', rose: '#E57BA4', violet: '#A889E6', slate: '#9AA4BE' },
};

const BASE = {
  light: { bg: '#F4F2EE', surface: '#FFFFFF', sunk: '#F0EDE7', band: '#E9E5DD', ink: '#17150F', muted: '#655F55', line: '#E2DED6', pos: '#1B8456', neg: '#B83D2B', other: '#ABA59A', card: '#1C1A16', card2: '#0F0E0C', accentInk: '#FFFFFF' },
  dark: { bg: '#121214', surface: '#1B1B1E', sunk: '#1F1F23', band: '#242428', ink: '#F3EFE6', muted: '#A8A39A', line: '#2F2F34', pos: '#4CC48A', neg: '#F07C66', other: '#6A665F', card: '#24221D', card2: '#151412', accentInk: '#17130A' },
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
    cardMuted: '#BDB4A3',
    cardLine: 'rgba(255,255,255,0.09)',
    cardCell: 'rgba(12,11,9,0.35)',
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
