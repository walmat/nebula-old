const Platforms = {
  Shopify: 'Shopify',
  Footsites: 'Footsites',
  Supreme: 'Supreme',
  Mesh: 'Mesh',
  YeezySupply: 'YeezySupply',
  Other: 'Other',
};

export const platformForStore = url => {
  if (/supreme/i.test(url)) {
    return Platforms.Supreme;
  }

  if (/yeezysupply/i.test(url)) {
    return Platforms.YeezySupply;
  }

  if(/champs|footlocker|footaction/i.test(url)) {
    return Platforms.Footsites;
  }

  // TODO: more checks for other platforms here...
  return Platforms.Shopify;
};

export default Platforms;
