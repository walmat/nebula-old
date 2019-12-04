export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

export const mapToNextTheme = {
  [THEMES.LIGHT]: THEMES.DARK,
  [THEMES.DARK]: THEMES.LIGHT,
};

export const mapBackgroundThemeToColor = {
  [THEMES.DARK]: '#23272a',
  [THEMES.LIGHT]: '#EFF1ED',
};

export const mapThemeToColor = {
  [THEMES.DARK]: '#23272a',
  [`${THEMES.DARK}--disabled`]: '#262626',
  [THEMES.LIGHT]: '#EFF1ED',
  [`${THEMES.LIGHT}--disabled`]: '#dcdcdc',
};
