import _ from 'underscore';
import sites from './sites.json';

export default async function fetchSites() {
  if (window.Bridge) {
    const newSites = await window.Bridge.requestSiteData();
    // TODO - get on launch
    console.log(newSites);
    if (newSites) {
      return this.buildSitesOptions(newSites);
    }
  }
  return this.buildSitesOptions(sites);
}

export function getAllSupportedSitesSorted(s) {
  const supported = s.filter(
    site => site.supported === 'experimental' || site.supported === 'stable',
  );
  return _.sortBy(supported, 'name');
}

export function buildSitesOptions(s) {
  return getAllSupportedSitesSorted(s).map(({ name, url, ...metadata }) => ({
    ...metadata,
    label: name,
    value: url,
  }));
}

export function getSite(list, name) {
  return list.find(s => s.name === name);
}
