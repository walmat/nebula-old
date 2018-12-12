import _ from 'underscore';
import sites from './sites.json';

export default function getAllSupportedSitesSorted() {
  const supported = sites.filter(
    site => site.supported === 'experimental' || site.supported === 'stable',
  );
  return _.sortBy(supported, 'name');
}

export function getSite(name) {
  return sites.find(s => s.name === name);
}
