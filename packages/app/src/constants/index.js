import { generate } from 'shortid';
import { parseURL } from 'whatwg-url';
import { sortBy } from 'lodash';

import { ROUTES, NAVBAR_ACTIONS, appActions } from '../store/actions';
import countries from './countries.json';
import sizes from './sizes';

import { ReactComponent as TasksIcon } from '../styles/images/navbar/tasks.svg';
import { ReactComponent as ProfilesIcon } from '../styles/images/navbar/profiles.svg';
import { ReactComponent as SettingsIcon } from '../styles/images/navbar/settings.svg';

export const Platforms = {
  Shopify: 'Shopify',
  Footsites: 'Footsites',
  Supreme: 'Supreme',
  Mesh: 'Mesh',
  YS: 'YS',
  Other: 'Other',
};

export const platformForStore = url => {
  if (/supreme/i.test(url)) {
    return Platforms.Supreme;
  }

  if (/yeezysupply/i.test(url)) {
    return Platforms.YS;
  }

  if (/footlocker|footaction/i.test(url)) {
    return Platforms.Footsites;
  }

  // TODO: more checks for other platforms here...
  return Platforms.Shopify;
};

export const harvesterDefaults = {
  [Platforms.Supreme]: {
    sitekey: '6LeWwRkUAAAAAOBsau7KpuC9AV-6J8mhw4AjC3Xz',
    host: 'http://supremenewyork.com',
  },
  [Platforms.Shopify]: {
    sitekey: '6LeoeSkTAAAAAA9rkZs5oS82l69OEYjKRZAiKdaF',
    host: 'http://checkout.shopify.com',
  },
};

export const HookTypes = {
  slack: 'slack',
  discord: 'discord',
};

const classNameCalc = (...supportedRoutes) => route =>
  supportedRoutes.includes(route) ? 'active' : null;

export const navbarDefaults = {
  [NAVBAR_ACTIONS.ROUTE_TASKS]: {
    Icon: TasksIcon,
    iconName: 'tasks',
    classNameGenerator: classNameCalc(ROUTES.TASKS, '/'),
  },
  [NAVBAR_ACTIONS.ROUTE_PROFILES]: {
    Icon: ProfilesIcon,
    iconName: 'profiles',
    classNameGenerator: classNameCalc(ROUTES.PROFILES),
  },
  [NAVBAR_ACTIONS.ROUTE_SETTINGS]: {
    Icon: SettingsIcon,
    iconName: 'settings',
    classNameGenerator: classNameCalc(ROUTES.SETTINGS),
  },
};

export const getSitesForCategory = (sites, category) =>
  sites.find(cat => cat.label === category).options;

export const getSite = (sites, site) => sites.find(t => t.value === site);

export const getCountry = countryCode =>
  Object.assign({}, countries.find(country => country.code === countryCode));

export const getProvinces = countryCode => {
  const country = getCountry(countryCode);
  return country && country.provinces;
};

export const getAllCountries = () => countries;

export const isProvinceDisabled = (country, disabled) => {
  if (country && country.value) {
    const { provinces } = getCountry(country.value);
    if (!provinces || !provinces.length) {
      return true;
    }
  }
  return disabled;
};

export const getCategory = category => sizes.find(c => c.label === category);

export const buildSizesForCategory = category =>
  getCategory(category).options.filter(size => size.label !== 'Random');

export const getSize = (size, category) =>
  getCategory(category).options.find(s => s.label === size).label;

export const getAllSizes = () => sizes;

const buildOptions = (list, value, label) =>
  list.map(datum => ({ value: datum[value], label: datum[label] }));

export const buildProfileOptions = profiles => buildOptions(profiles, 'id', 'name');
export const buildAccountOptions = accounts =>
  accounts.map(({ id, name, username, password }) => ({
    label: name,
    value: {
      id,
      name,
      username,
      password,
    },
  }));

export const buildAccountListOptions = accounts => buildOptions(accounts, 'id', 'name');

export const buildCountryOptions = () => buildOptions(getAllCountries(), 'code', 'name');
export const buildProvinceOptions = country => {
  if (country && country.value) {
    return buildOptions(getProvinces(country.value), 'code', 'name');
  }
  return null;
};
export const buildWebhookOptions = webhooks => buildOptions(webhooks, 'id', 'name');
export const buildCategoryOptions = () => {
  const categories = [
    'new',
    'Accessories',
    'Bags',
    'Hats',
    'Jackets',
    'Pants',
    'Shirts',
    'Shoes',
    'Shorts',
    'Skate',
    'Sweatshirts',
    'T-Shirts',
    'Tops/Sweaters',
  ];
  return categories.map(cat => ({ label: cat, value: cat }));
};

export const Types = {
  SAFE: 'SAFE',
  FAST: 'FAST',
};

export const States = {
  Running: 'RUNNING',
  Stopped: 'STOPPED',
};

export const _getId = list => {
  let id;

  const idCheck = tasks => tasks.some(t => t.id === id);

  do {
    id = generate();
  } while (idCheck(list));

  return { id };
};

export const createStore = value => {
  const URL = parseURL(value);
  if (!URL || !URL.host) {
    return null;
  }
  return { name: URL.host, url: `${URL.scheme}://${URL.host}` };
};

export const createSize = value => (!value ? null : value);

export const mapTypeToNextType = type => {
  switch (type) {
    case Types.SAFE:
      return Types.FAST;
    case Types.FAST:
      return Types.SAFE;
    default:
      return Types.SAFE;
  }
};

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
  [THEMES.DARK]: '#2c2f33',
  [`${THEMES.DARK}--disabled`]: '#262626',
  [THEMES.LIGHT]: '#EFF1ED',
  [`${THEMES.LIGHT}--disabled`]: '#dcdcdc',
};

export const fetchSites = async store => {
  try {
    const res = await fetch(`https://nebula-orion-api.herokuapp.com/sites`);

    if (!res.ok) {
      return;
    }

    const sites = await res.json();

    if (sites && sites.length) {
      const sorted = sortBy(sites, site => site.index);
      store.dispatch(appActions.sites(sorted));
    }
  } catch (error) {
    // silently fail...
  }
};