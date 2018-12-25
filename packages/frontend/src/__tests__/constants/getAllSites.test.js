/* global describe it expect beforeEach */
import getAllSites, { getSite } from '../../constants/getAllSites';

describe('getAllSites', () => {
  let expectedSites;

  beforeEach(() => {
    expectedSites = [
      {
        value: 'https://12amrun.com',
        label: '12AM:Run',
        supported: true,
        apiKey: 'e5b0d0dc103ac126c494f8cc1fd70fe9',
        auth: false,
      },
      {
        value: 'https://amongstfew.com',
        label: 'Amongst Few',
        supported: true,
        auth: false,
      },
      {
        value: 'https://blendsus.com',
        label: 'Blends',
        supported: true,
        apiKey: 'a695a9ac76b89f50663628617f8498f6',
        auth: false,
      },
      {
        value: 'https://shop.bdgastore.com',
        label: 'Bodega',
        supported: true,
        auth: false,
      },
      {
        value: 'https://burnrubbersneakers.com',
        label: 'Burn Rubber',
        supported: true,
        auth: false,
      },
      {
        value: 'https://eflash.doverstreetmarket.com',
        label: 'DSM EU',
        supported: true,
        auth: false,
      },
      {
        value: 'https://eflash-jp.doverstreetmarket.com',
        label: 'DSM JP',
        supported: true,
        auth: false,
      },
      {
        value: 'https://eflash-sg.doverstreetmarket.com',
        label: 'DSM SG',
        supported: true,
        auth: false,
      },
      {
        value: 'https://eflash-us.doverstreetmarket.com',
        label: 'DSM US',
        supported: true,
        auth: false,
      },
      {
        value: 'https://thedarksideinitiative.com',
        label: 'Dark Side Initiative',
        supported: true,
        auth: false,
      },
      {
        value: 'https://funko-shop.com',
        label: 'Funko Shop',
        supported: true,
        auth: false,
      },
      {
        value: 'https://shop.havenshop.ca',
        label: 'Haven CA',
        supported: true,
        auth: false,
      },
      {
        value: 'https://kith.com',
        label: 'Kith',
        supported: true,
        apiKey: '08430b96c47dd2ac8e17e305db3b71e8',
        auth: false,
      },
      {
        value: 'https://deadstock.ca',
        label: 'Livestock',
        supported: true,
        auth: false,
      },
      {
        value: 'https://minishopmadrid.com',
        label: 'Mini Shop Madrid',
        supported: true,
        auth: false,
      },
      // TEMPORARY -- For Testing purposes only!
      // {
      //   value: 'http://localhost:9000',
      //   label: 'Mock Server',
      //   supported: true,
      //   auth: false,
      // },
      {
        value: 'https://offthehook.ca',
        label: 'Off the Hook',
        supported: true,
        auth: false,
      },
      {
        value: 'https://rsvpgallery.com',
        label: 'RSVP Gallery',
        supported: true,
        auth: false,
      },
      {
        value: 'https://shopnicekicks.com',
        label: 'Shop Nice Kicks',
        supported: true,
        auth: false,
      },
      {
        value: 'https://nebulabots.com',
        label: 'Test Site',
        supported: true,
        apiKey: '6526a5b5393b6316a64853cfe091841c',
        auth: false,
      },
      {
        value: 'https://shop.travisscott.com',
        label: 'Travis Scott',
        supported: true,
        auth: false,
      },
      {
        value: 'https://shop.undefeated.com',
        label: 'Undefeated',
        supported: true,
        apiKey: 'a0faf54ad7ec6fbbab86cd3f949c3cb9',
        auth: true,
      },
      {
        value: 'https://wishatl.com',
        label: 'Wish Atlanta',
        supported: true,
        auth: false,
      },
      {
        value: 'https://yeezysupply.com',
        label: 'Yeezy Supply',
        supported: true,
        auth: false,
      },
    ];
  });

  it('should return all sites correctly', () => {
    expect(getAllSites()).toEqual(expectedSites);
  });

  it('should lookup the correct sizes', () => {
    expectedSites.forEach(site => {
      expect(getSite(site.value)).toEqual({ ...site, supported: true });
    });
  });
});
