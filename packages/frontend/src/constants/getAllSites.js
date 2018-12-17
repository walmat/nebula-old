import _ from 'underscore';
import sites from './sites.json';

export function buildSitesOptions(siteList) {
  return siteList.map(({ name, url, ...metadata }) => ({
    ...metadata,
    label: name,
    value: url,
  }));
}

export default async function fetchSites() {
  if (window.Bridge) {
    const newSites = await window.Bridge.requestSiteData();
    console.log(newSites);
    // TODO - newSites is always undefined..
    if (newSites) {
      return buildSitesOptions(newSites);
    }
  }
  return buildSitesOptions(sites);
}

export function getSite(list, name) {
  return list.find(s => s.name === name);
}
