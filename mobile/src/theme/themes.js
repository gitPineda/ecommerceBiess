import brand from '../config/brand.json';

export const DEFAULT_THEME_ID = 'soft-blue';

const softBluePalette = {
  ...brand.palette,
};

const monoOrangePalette = {
  primary: '#FF8A1E',
  primaryDark: '#050505',
  secondary: '#0D0D0D',
  accent: '#FFB86B',
  background: '#000000',
  surface: '#111111',
  surfaceAlt: '#1A1A1A',
  text: '#FAFAFA',
  muted: '#A1A1AA',
  border: '#27272A',
  danger: '#F87171',
  success: '#4ADE80',
  warning: '#FB923C',
};

export const themeOptions = [
  {
    id: 'soft-blue',
    label: 'Azul Pastel',
    description: 'Fondos blancos con acentos azules y apariencia limpia.',
    palette: softBluePalette,
  },
  {
    id: 'mono-orange',
    label: 'Negro Naranja',
    description: 'Fondos negros con tarjetas oscuras y acentos naranjas.',
    palette: monoOrangePalette,
  },
];

function buildSoftBlueColors(palette) {
  return {
    ...palette,
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F6FF',
    text: '#0F172A',
    muted: '#5B6475',
    border: '#D7E3F0',
    white: '#FFFFFF',
    black: '#0B1120',
    primarySoft: '#DCEAFE',
    primarySoftAlt: '#EEF4FF',
    neutralSoft: '#F1F5F9',
    neutralBorder: '#CBD5E1',
    dangerSoft: '#FBECEC',
    dangerBorder: '#F0CACA',
    successSoft: '#EDF7F1',
    successBorder: '#CFE4D7',
    warningSoft: '#F8F1E8',
    warningBorder: '#E8D9C5',
    promoSurface: '#DCEAFE',
    promoBorder: '#93C5FD',
    promoText: '#163C6B',
    overlay: 'rgba(49, 91, 140, 0.08)',
    shadow: 'rgba(15, 23, 42, 0.08)',
    onDarkMuted: '#DCEAFE',
    onDarkSoft: '#EDF4FF',
  };
}

function buildMonoOrangeColors(palette) {
  return {
    ...palette,
    white: '#FFFFFF',
    black: '#000000',
    primarySoft: '#2A1606',
    primarySoftAlt: '#1D1207',
    neutralSoft: '#171717',
    neutralBorder: '#3F3F46',
    dangerSoft: '#2A1313',
    dangerBorder: '#7F1D1D',
    successSoft: '#0F1F15',
    successBorder: '#166534',
    warningSoft: '#251407',
    warningBorder: '#C2410C',
    promoSurface: '#FFE3BF',
    promoBorder: '#FFB86B',
    promoText: '#4A2400',
    overlay: 'rgba(255, 138, 30, 0.18)',
    shadow: 'rgba(0, 0, 0, 0.45)',
    onDarkMuted: '#FFD6A3',
    onDarkSoft: '#FFE8C7',
  };
}

export function buildThemeColors(themeId) {
  const selectedTheme =
    themeOptions.find((option) => option.id === themeId) ||
    themeOptions.find((option) => option.id === DEFAULT_THEME_ID) ||
    themeOptions[0];

  if (selectedTheme.id === 'mono-orange') {
    return buildMonoOrangeColors(selectedTheme.palette);
  }

  return buildSoftBlueColors(selectedTheme.palette);
}

export function getThemeOption(themeId) {
  return (
    themeOptions.find((option) => option.id === themeId) ||
    themeOptions.find((option) => option.id === DEFAULT_THEME_ID) ||
    themeOptions[0]
  );
}
