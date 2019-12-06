import { sortBy } from 'lodash';

import { appActions } from '../store/actions';

// eslint-disable-next-line import/prefer-default-export
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
