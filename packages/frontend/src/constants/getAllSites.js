import _ from 'underscore';
import sites from './sites.json';

export function getAllSupportedSitesSorted(s) {
  const supported = s.filter(
    site => site.supported === 'experimental' || site.supported === 'stable',
  );
  return _.sortBy(supported, 'name');
}

export function buildSitesOptions(s) {
  console.log(s);
  return getAllSupportedSitesSorted(s).map(({ name, url, ...metadata }) => ({
    ...metadata,
    label: name,
    value: url,
  }));
}

export default async function fetchSites() {
  if (window.Bridge) {
    const newSites = await window.Bridge.requestSiteData();
    console.log(newSites);
    if (newSites) {
      return buildSitesOptions(newSites);
    }
  }
  return buildSitesOptions(sites);
}

export function getSite(list, name) {
  return list.find(s => s.name === name);
}
