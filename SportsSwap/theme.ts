// Shared colour themes for light / dark mode — sleek white / gold / black
export const lightColors = {
  GOLD: '#C8961E',
  GOLD_DARK: '#9A6E12',
  GOLD_LIGHT: '#F8EFD6',
  GOLD_TEXT: '#8A6410',
  BG: '#ffffff',
  BG2: '#F4F3F0',
  BG3: '#EBEAE5',
  TEXT: '#13120F',
  TEXT2: '#6E6E68',
  TEXT3: '#A6A6A0',
  BORDER: 'rgba(0,0,0,0.07)',
  BORDER2: 'rgba(0,0,0,0.14)',
};

export const darkColors = {
  GOLD: '#D2A02C',
  GOLD_DARK: '#9A6E12',
  GOLD_LIGHT: '#2A2310',
  GOLD_TEXT: '#E7BE53',
  BG: '#17171A',
  BG2: '#212126',
  BG3: '#0C0C0E',
  TEXT: '#F3F1EA',
  TEXT2: '#9C9CA4',
  TEXT3: '#646469',
  BORDER: 'rgba(255,255,255,0.08)',
  BORDER2: 'rgba(255,255,255,0.16)',
};

export type Colors = typeof lightColors;
