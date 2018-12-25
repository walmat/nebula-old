/* global describe it expect beforeEach */
import _ from 'underscore';
import getAllSupportedSitesSorted, { getSite } from '../../constants/getAllSites';
import sites from '../../constants/sites.json';

describe('getAllSites', () => {
  it('should return all sites correctly', () => {
    const supported = sites.filter(val => val.supported === 'true');
    expect(getAllSupportedSitesSorted()).toEqual(_.sortBy(supported, 'label'));
  });

  it('should lookup the correct sizes', () => {
    sites.forEach(site => {
      expect(getSite(site.value)).toEqual({ ...site, supported: 'true' });
    });
  });
});
