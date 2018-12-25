import _ from 'underscore';
import sites from './sites.json';

export default function getAllSupportedSitesSorted() {
  const supported = sites.filter(val => val.supported === 'true');
  return _.sortBy(supported, 'label');
}

export function getSite(site) {
  return sites.find(t => t.value === site);
}
