export function getSitesForCategory(sites, category) {
  return sites.find(cat => cat.label === category).options;
}

export function getSite(sites, site) {
  return sites.find(t => t.value === site);
}
