/* global describe it expect beforeEach */
import _ from 'underscore';

import sites from '../../constants/sites.json';
import buildSitesOptions, {
  getAllSupportedSitesSorted,
  getSite,
} from '../../constants/getAllSites';

describe('getAllSites', () => {
  it('should return all supported sites correctly', () => {
    const supported = sites.filter(
      site => site.supported === 'experimental' || site.supported === 'stable',
    );
    const sorted = _.sortBy(supported, 'name');
    expect(getAllSupportedSitesSorted()).toEqual(sorted);
  });

  describe('should build site options correctly', () => {
    const actual = getAllSupportedSitesSorted().map(({ name, url, ...metadata }) => ({
      ...metadata,
      label: name,
      value: url,
    }));
    expect(buildSitesOptions()).toEqual(actual);
  });

  it('should lookup the correct sites', () => {
    sites.forEach(site => {
      expect(getSite(site.name)).toEqual({ ...site });
    });
  });
});
