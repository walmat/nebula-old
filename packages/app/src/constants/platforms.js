const Platforms = {
  Shopify: 'Shopify',
  Footsites: 'Footsites',
  Supreme: 'Supreme',
  Mesh: 'Mesh',
  YS: 'YS',
  Other: 'Other',
};

export const platformForStore = url => {
  if (/supreme/i.test(url)) {
    return Platforms.Supreme;
  }

  if (/yeezysupply/i.test(url)) {
    return Platforms.YS;
  }

  // TODO: more checks for other platforms here...
  return Platforms.Shopify;
};

export default Platforms;
