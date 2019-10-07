const urlToOptionIndex = {
  'https://12amrun.com': 1,
  'https://a-ma-maniere.com': 1,
  'https://apbstore.com': 1,
  'https://www.addictmiami.com': 1,
  'https://shop.antisocialsocialclub.com': 1,
  'https://attic2zoo.com': 1,
  'https://shop.bbcicecream.com': 2,
  'https://bbcicecream.com': 2,
  'https://bbcicecream.eu': 1,
  'https://us.bape.com': 3,
  'https://beatniconline.com': 1,
  'http://blkmkt.us': 1,
  'http://black-market-usa.myshopify.com': 1,
  'https://blendsus.com': 1,
  'https://shop.bdgastore.com': 2,
  'https://bowsandarrowsberkeley.com': 1,
  'https://bringtheheatbots.com': 1,
  'https://burnrubbersneakers.com': 1,
  'https://commonwealth-ftgg.com': 1,
  'https://cncpts.com': 1,
  'https://www.courtsidesneakers.com': 2,
  'https://eflash-us.doverstreetmarket.com': 1,
  'https://eflash.doverstreetmarket.com': 1,
  'https://eflash-sg.doverstreetmarket.com': 1,
  'https://eflash-jp.doverstreetmarket.com': 1,
  'https://shop.exclucitylife.com': 1,
  'https://shop.extrabutterny.com': 1,
  'https://featuresneakerboutique.com': 2,
  'https://funko-shop.myshopify.com': 1,
  'https://graffitiprints.myshopify.com': 1,
  'https://shop.havenshop.com': 1,
  'https://highsandlows.net.au': 1,
  'https://shophny.com': 1,
  'https://hotoveli.com': 1,
  'https://johngeigerco.com': 1,
  'https://kith.com': 1,
  'https://kyliecosmetics.com': 1,
  'https://lapstoneandhammer.com': 1,
  'https://deadstock.ca': 1,
  'https://machusonline.com': 1,
  'https://marathonsports.com': 1,
  'https://shop.marathonsports.com': 1,
  'https://minishopmadrid.com': 1,
  'https://nrml.ca': 2,
  'https://noirfonce.eu': 1,
  'https://notre-shop.com': 1,
  'https://store.obeygiant.com': 1,
  'https://us.octobersveryown.com': 1,
  'https://uk.octobersveryown.com': 1,
  'https://offthehook.ca': 1,
  'https://www.oipolloi.com': 1,
  'https://www.omocat-shop.com': 1,
  'https://www.onenessboutique.com': 1,
  'https://packershoes.com': 1,
  'https://shop-usa.palaceskateboards.com': 1,
  'https://shop.palaceskateboards.com': 1,
  'https://shop-jp.palaceskateboards.com': 1,
  'https://par5-milano-yeezy.com': 1,
  'https://shop.placesplusfaces.com': 1,
  'https://thepremierstore.com': 1,
  'https://properlbc.com': 1,
  'https://rsvpgallery.com': 1,
  'https://us.reigningchamp.com': 1,
  'https://renarts.com': 1,
  'https://www.rimenyc.com': 1,
  'https://rise45.com': 1,
  'https://rockcitykicks.com': 1,
  'https://www.ronindivision.com': 1,
  'https://shop.ronniefieg.com': 1,
  'https://saintalfred.com': 1,
  'https://www.serenawilliams.com': 1,
  'https://shoegallerymiami.com': 1,
  'https://sneakerpolitics.com': 1,
  'https://sneakerworldshop.com': 1,
  'https://www.socialstatuspgh.com': 1,
  'https://solefly.com': 2,
  'https://staplepigeon.com': 1,
  'https://www.stoneisland.co.uk': 1,
  'https://suede-store.com': 1,
  'https://www.trophyroomstore.com': 1,
  'https://undefeated.com': 2,
  'https://shop.undefeated.com': 2,
  'https://unknwn.com': 2,
  'https://vlone.co': 1,
  'https://wishatl.com': 2,
  'https://worldofhombre.com': 1,
  'https://www.xhibition.co': 1,
  'https://yeezysupply.com': 1,
  'https://asia.yeezysupply.com': 1,
  'https://europe.yeezysupply.com': 1,
  'https://350.yeezysupply.com': 1,
  'https://700.yeezysupply.com': 1,
  'https://shop.justintimberlake.com': 1,
  'https://theclosetinc.com': 1,
  'https://fearofgod.com': 1,
  'https://stampd.com': 1,
  'https://aj1.travisscott.com': 1,
  'https://astros.travisscott.com': 1,
  'https://shop.travisscott.com': 1,
  'https://justdon.com': 1,
  'https://lessoneseven.com': 1,
  'https://thedarksideinitiative.com': 1,
  'https://ficegallery.com': 1,
  'https://hanon-shop.com': 1,
  'https://goodasgoldshop.com': 1,
  'https://laceupnyc.com': 1,
  'https://www.ellenshop.com': 1,
  'https://launch.toytokyo.com': 1,
  'https://westnyc.com': 1,
  'https://thesurestore.com': 1,
  'https://thechimpstore.com': 1,
  'https://alifenewyork.com': 1,
  'https://atmosny.com': 1,
  'https://shop.hbo.com': 1,
  'https://biancachandon.com': 1,
  'https://centre214.com': 1,
  'https://concrete.nl': 1,
  'https://creme321.com': 1,
  'https://doomsday-store.com': 1,
  'https://epitomeatl.com': 1,
  'https://freshragsfl.com': 1,
  'https://nomadshop.net': 1,
  'https://revengexstorm.com': 1,
  'https://shopnicekicks.com': 1,
  'https://sneakerjunkiesusa.com': 1,
  'https://stay-rooted.com': 1,
  'https://store.unionlosangeles.com': 2,
  'https://thesportsedit.com': 1,
  'https://txdxe.com': 1,
  'https://www.abovethecloudsstore.com': 1,
  'https://amongstfew.com': 1,
  'https://bbbranded.com': 2,
  'https://capsuletoronto.com': 1,
  'https://cityblueshop.com': 1,
  'https://courtsidesneakers.com': 2,
  'https://dope-factory.com': 1,
  'https://footzonenyc.com': 2,
  'https://huntinglodge.no': 1,
  'https://incu.com': 1,
  'https://k101store.com': 1,
  'https://kongonline.co.uk': 1,
  'https://leaders1354.com': 1,
  'https://letusprosper.com': 1,
  'https://likelihood.us': 1,
  'https://manorphx.com': 1,
  'https://pampamlondon.com': 1,
  'https://www.rooneyshop.com': 2,
  'https://solestop.com': 1,
  'http://usgstore.com.au': 2,
  'https://nebulabots.com': 1,
  'https://diamondsupplyco.com': 1,
  // 'http://localhost:9000': 1, // TEMPORARY for testing purposes only...
};

// Generate the correct "option<index>" from the optionIndex map
const urlToVariantOption = (function generateUTVO() {
  const utvs = {};
  Object.keys(urlToOptionIndex).forEach(key => {
    utvs[key] = urlToOptionIndex[key] ? `option${urlToOptionIndex[key]}` : 'option1';
  });
  return utvs;
})();

// Generate the correct title segment test from the optionIndex map
const urlToTitleSegment = (function generateUTTS() {
  const utts = {};
  Object.keys(urlToOptionIndex).forEach(key => {
    // attach a function for each url
    const siteOption = urlToOptionIndex[key] ? urlToOptionIndex[key] : 1;
    utts[key] = title => {
      if (!title) {
        return null;
      }
      // split the title into segments based the `/` delimiter
      const segments = title.split('/');
      // Check if we have a valid number of segments
      if (segments.length >= siteOption) {
        // return the correct 0-indexed segment (trimming the surrounding whitespace)
        return segments[siteOption - 1].trim();
      }
      // Invalid segment length, return null
      return null;
    };
  });
  return utts;
})();

const validateVariantSize = (variant, expectedSize, url) =>
  variant[urlToVariantOption[url]].trim().includes(expectedSize.trim()) ||
  urlToVariantOption[url].trim().includes(expectedSize.trim());

const clothingRegexMap = {
  XXS: 'xxs|xxsm|xxsml|xx-small|extra extra small',
  XS: 'xs|xsm|xsml|x-small|extra small',
  S: 's|sm|sml|small',
  M: 'm|md|med|medium',
  L: 'l|lg|lrg|large',
  XL: 'xl|xlg|xlrg|x-large|extra large',
  XXL: 'xxl|xxlg|xxlrg|xx-large|extra extra large',
};

module.exports = {
  urlToOptionIndex,
  urlToTitleSegment,
  urlToVariantOption,
  validateVariantSize,
  clothingRegexMap,
};
