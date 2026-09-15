/**
 * Bump's visual language: warm, soft, high-contrast where it matters and
 * low-contrast everywhere else. Everything is a token so dark mode is a
 * single swap rather than a pile of conditionals.
 */

export interface Palette {
  /** Warm off-white (never pure white) in light mode. */
  background: string;
  /** Slightly raised surface for cards. */
  card: string;
  /** A second surface used for chips and inset rows. */
  surface: string;
  /** Hairline dividers and card outlines. */
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  /** Bump's signature blush. */
  accent: string;
  accentSoft: string;
  accentText: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  /** Pastel washes used to tint reminder cards by section. */
  pastels: Record<PastelName, string>;
  /** Text colour that stays legible on top of the matching pastel. */
  pastelInk: Record<PastelName, string>;
  shadow: string;
  shadowOpacity: number;
  scrim: string;
}

export type PastelName = 'blush' | 'peach' | 'butter' | 'mint' | 'sky' | 'lilac';

export const PASTEL_NAMES: PastelName[] = ['blush', 'peach', 'butter', 'mint', 'sky', 'lilac'];

export const lightPalette: Palette = {
  background: '#FAF7F2',
  card: '#FFFFFF',
  surface: '#F2EEE7',
  border: 'rgba(32, 26, 20, 0.07)',
  text: '#221E1A',
  textSecondary: '#6B6259',
  textTertiary: '#9C948B',
  accent: '#E8859B',
  accentSoft: '#FFE3E8',
  accentText: '#FFFFFF',
  success: '#3F9E78',
  successSoft: '#D8F3E4',
  danger: '#D9764F',
  dangerSoft: '#FFE3D2',
  pastels: {
    blush: '#FFE3E8',
    peach: '#FFE8D6',
    butter: '#FBF0C4',
    mint: '#D8F3E4',
    sky: '#DDEAFB',
    lilac: '#EAE2FB',
  },
  pastelInk: {
    blush: '#8C3F51',
    peach: '#8A5326',
    butter: '#77621B',
    mint: '#256B51',
    sky: '#2F5487',
    lilac: '#54427F',
  },
  shadow: '#4A3B2E',
  shadowOpacity: 0.09,
  scrim: 'rgba(30, 24, 18, 0.32)',
};

export const darkPalette: Palette = {
  background: '#151317',
  card: '#221F26',
  surface: '#2C2833',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#F5F1EC',
  textSecondary: '#ADA4B0',
  textTertiary: '#7C7484',
  accent: '#F09CAF',
  accentSoft: '#42303A',
  accentText: '#231017',
  success: '#7ED3AC',
  successSoft: '#22382F',
  danger: '#F0A184',
  dangerSoft: '#3D2B22',
  pastels: {
    blush: '#432F37',
    peach: '#42332A',
    butter: '#3D3826',
    mint: '#27392F',
    sky: '#293446',
    lilac: '#352E48',
  },
  pastelInk: {
    blush: '#FFC9D5',
    peach: '#FFD3B1',
    butter: '#F2E1A2',
    mint: '#A9E8CA',
    sky: '#BAD3F5',
    lilac: '#D3C4F5',
  },
  shadow: '#000000',
  shadowOpacity: 0.4,
  scrim: 'rgba(0, 0, 0, 0.55)',
};

/** 4pt-derived spacing scale. Bump leans generous — `lg` is the default gutter. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  xl: 34,
  pill: 999,
} as const;

/** Nunito weights loaded at boot; see `useAppFonts`. */
export const fonts = {
  regular: 'Nunito_500Medium',
  medium: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
} as const;

export const type = {
  hero: { fontFamily: fonts.heavy, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fonts.heavy, fontSize: 24, lineHeight: 30 },
  section: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, letterSpacing: 0.4 },
  body: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 23 },
  bodySoft: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17 },
  micro: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.5 },
} as const;

/** Soft, wide, low-opacity shadow — never a hard drop shadow. */
export function softShadow(palette: Palette, level: 1 | 2 | 3 = 1) {
  const config = {
    1: { radius: 12, offset: 4, opacityScale: 1, elevation: 2 },
    2: { radius: 22, offset: 8, opacityScale: 1.25, elevation: 5 },
    3: { radius: 34, offset: 14, opacityScale: 1.6, elevation: 10 },
  }[level];

  return {
    shadowColor: palette.shadow,
    shadowOpacity: palette.shadowOpacity * config.opacityScale,
    shadowRadius: config.radius,
    shadowOffset: { width: 0, height: config.offset },
    elevation: config.elevation,
  };
}
