/* global describe it expect beforeEach */
import _ from 'underscore';

import sites from '../../constants/sites.json';
import getAllSupportedSitesSorted, { getSite } from '../../constants/getAllSites';

describe('getAllSites', () => {
  it('should return all sites correctly', () => {
    const supported = sites.filter(
      site => site.supported === 'experimental' || site.supported === 'stable',
    );
    const sorted = _.sortBy(supported, 'name');
    expect(getAllSupportedSitesSorted()).toEqual(sorted);
  });

  it('should lookup the correct sites', () => {
    sites.forEach(site => {
      expect(getSite(site.name)).toEqual({ ...site });
    });
  });
});
