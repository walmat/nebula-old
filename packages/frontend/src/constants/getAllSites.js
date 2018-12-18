
export function buildSitesOptions(siteList) {
  return siteList.map(({ name, url, ...metadata }) => ({
    ...metadata,
    label: name,
    value: url,
  }));
}

export default function fetchSites() {
  return new Promise(async (resolve, reject) => {
    if (window.Bridge) {
      const sites = await window.Bridge.requestSiteData();
      resolve(buildSitesOptions(sites));
    }
    reject(new Error('window.Bridge unavailable.'))
  });
}

export function getSite(list, name) {
  return list.find(s => s.label === name);
}
