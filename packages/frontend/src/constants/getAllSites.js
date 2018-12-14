import _ from 'underscore';
import sites from './sites.json';

export function getAllSupportedSitesSorted() {
  const supported = sites.filter(
    site => site.supported === 'experimental' || site.supported === 'stable',
  );
  return _.sortBy(supported, 'name');
}

export default function buildSitesOptions() {
  return getAllSupportedSitesSorted().map(({ name, url, ...metadata }) => ({
    ...metadata,
    label: name,
    value: url,
  }));
}

export function getSite(name) {
  return sites.find(s => s.name === name);
}
