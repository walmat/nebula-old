export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

export const mapToNextTheme = {
  [THEMES.LIGHT]: THEMES.DARK,
  [THEMES.DARK]: THEMES.LIGHT,
};

export const mapBackgroundThemeToColor = {
  [THEMES.DARK]: '#313236',
  [THEMES.LIGHT]: '#f4f4f4',
};

export const mapThemeToColor = {
  [THEMES.DARK]: '#393c3f',
  [`${THEMES.DARK}--disabled`]: '#262626',
  [THEMES.LIGHT]: '#f4f4f4',
  [`${THEMES.LIGHT}--disabled`]: '#dcdcdc',
};
