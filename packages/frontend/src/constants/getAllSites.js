import sites from './sites';

export default function getAllSupportedSitesSorted() {
  return sites;
}

export function getSite(site) {
  return sites.find(t => t.value === site);
}
