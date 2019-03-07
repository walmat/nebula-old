export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

export const mapToNextTheme = {
  [THEMES.LIGHT]: THEMES.DARK,
  [THEMES.DARK]: THEMES.LIGHT,
};

export const mapThemeToColor = {
  [THEMES.DARK]: '#313236',
  [`${THEMES.DARK}--disabled`]: '#262626',
  [THEMES.LIGHT]: '#f4f4f4',
  [`${THEMES.LIGHT}--disabled`]: '#dcdcdc',
};
