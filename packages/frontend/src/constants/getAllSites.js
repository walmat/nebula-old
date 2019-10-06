import sites from './sites';

export default function getAllSupportedSitesSorted() {
  return sites;
}

export function getSitesForCategory(category) {
  return sites.find(cat => cat.label === category).options;
}

export function getSite(site) {
  return sites.find(t => t.value === site);
}
