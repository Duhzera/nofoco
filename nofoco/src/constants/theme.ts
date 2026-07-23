/**
 * NoFoco — design tokens.
 * App dark-first: verde lima como cor de ação, cada macronutriente com cor própria.
 * Fonte da verdade de UI: seção 6 do PLANEJAMENTO_APP.md.
 */

import { Platform } from 'react-native';

/** Paleta NoFoco (tema escuro — principal). */
export const NoFoco = {
  bg: '#0D0F0D',
  surface: '#181B16',
  surface2: '#232720',
  ink: '#F2F5F0',
  soft: '#919989',
  hair: '#2B312A',
  faint: '#14170F',

  accent: '#A6E052',
  accentPress: '#8FC93F',
  onAccent: '#0D0F0D',

  // cores por nutriente (fixas em todo o app)
  carb: '#F2A33C',
  protein: '#4A9DE0',
  fat: '#E86FA6',
  kcal: '#A6E052',
  micro: '#5BC0A8',

  // semânticas
  danger: '#E2574C',
  warning: '#F2A33C',
  success: '#A6E052',
} as const;

/**
 * Mantém a forma esperada por expo-router (light/dark).
 * Como o app é dark-first, "light" recebe os mesmos valores por ora
 * (o tema claro entra como variante futura — ver plano §6.8).
 */
export const Colors = {
  light: {
    text: NoFoco.ink,
    background: NoFoco.bg,
    backgroundElement: NoFoco.surface,
    backgroundSelected: NoFoco.surface2,
    textSecondary: NoFoco.soft,
    tint: NoFoco.accent,
  },
  dark: {
    text: NoFoco.ink,
    background: NoFoco.bg,
    backgroundElement: NoFoco.surface,
    backgroundSelected: NoFoco.surface2,
    textSecondary: NoFoco.soft,
    tint: NoFoco.accent,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Espaçamento em px (base 4). */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Raio de canto. */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const MaxContentWidth = 800;
