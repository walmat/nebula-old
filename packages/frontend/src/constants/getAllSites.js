import sites from './sites.json';

export function buildSitesOptions(siteList) {
  return siteList.map(({ name, url, ...metadata }) => ({
    ...metadata,
    label: name,
    value: url,
  }));
}

export default function fetchSites() {
  return new Promise(async resolve => {
    let fetched;
    if (window.Bridge) {
      const newSites = await window.Bridge.requestSiteData();
      if (newSites) {
        fetched = buildSitesOptions(newSites);
      } else {
        fetched = buildSitesOptions(sites);
      }
    }
    resolve(fetched);
  });
}

export function getSite(list, name) {
  return list.find(s => s.label === name);
}
