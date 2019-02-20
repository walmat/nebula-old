export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

export const mapThemeToColor = {
  [THEMES.DARK]: '#393c3f',
  [`${THEMES.DARK}--disabled`]: '#262626',
  [THEMES.LIGHT]: '#f4f4f4',
  [`${THEMES.LIGHT}--disabled`]: '#dcdcdc',
};
