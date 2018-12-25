const urlToOptionIndex = {
  'https://kith.com': 1,
  'https://us.bape.com': 3,
  'https://commonwealth-ftgg.com': 1,
  'https://yeezysupply.com': 1,
  'https://funko-shop.com': 1, // TODO -- no products loaded
  'https://shop-usa.palaceskateboards.com': 1,
  'https://12amrun.com': 1,
  'https://xhibition.co': 1,
  'https://worldofhombre.com': 1,
  'https://westnyc.com': 1, // TODO (option 1 looks like 7/M for US 7.. 8/M for US 8, etc.)
  'https://thedarksideinitiative.com': 1,
  'https://unknwn.com': 2,
  'https://thesurestore.com': 1,
  'https://theclosetinc.com': 1,
  'https://thechimpstore.com': 1,
  'https://a-ma-maniere.com': 1,
  'https://alifenewyork.com': 1,
  'https://rimenyc.com': 2,
  'https://stampd.com': 1,
  'https://atmosny.com': 1,
  'https://biancachandon.com': 1,
  'https://blendsus.com': 1,
  'https://burnrubbersneakers.com': 1,
  'https://ca.octobersveryown.com': 1,
  'https://us.octobersveryown.com': 1,
  'https://centre214.com': 1,
  'https://cncpts.com': 1,
  'https://concrete.nl': 1, // TODO (option 1 looks like: UK 3.5 - US 4.0 - EU 36.0)
  'https://creme321.com': 1,
  'https://doomsday-store.com': 1,
  'https://epitomeatl.com': 1,
  'https://freshragsfl.com': 1,
  'https://justdon.com': 1,
  'https://lessoneseven.com': 1,
  'https://noirfonce.eu': 1,
  'https://nomadshop.net': 1,
  'https://nrml.ca': 2,
  'https://offthehook.ca': 1,
  'https://packershoes.com': 1,
  'https://properlbc.com': 1, // TODO (option 1 looks like: M3.5/W5)
  'https://renarts.com': 1,
  'https://revengexstorm.com': 1,
  'https://rise45.com': 1,
  'https://rockcitykicks.com': 1,
  'https://rsvpgallery.com': 1,
  'https://shoegallerymiami.com': 1,
  'https://shop.bdgastore.com': 2,
  'https://shop.exclucitylife.com': 1,
  'https://shop.extrabutterny.com': 1,
  'https://shop.havenshop.ca': 1,
  'https://shop.justintimberlake.com': 1,
  'https://shop.travisscott.com': 1,
  'https://shop.undefeated.com': 2,
  'https://shopnicekicks.com': 1,
  'https://sneakerjunkiesusa.com': 1,
  'https://sneakerpolitics.com': 1,
  'https://stay-rooted.com': 1,
  'https://store.unionlosangeles.com': 2,
  'https://thesportsedit.com': 1,
  'https://txdxe.com': 1,
  'https://wishatl.com': 2,
  'https://www.abovethecloudsstore.com': 1, // TODO -- (option 1 looks like: US 7)
  'https://addictmiami.com': 1, // TODO -- (option 1 looks like: 5.5 US Women, 44 IT, etc.)
  'https://amongstfew.com': 1, // TODO -- (option 1 looks like: US 8 / UK 7 / EU 41)
  'https://apbstore.com': 1,
  'https://bbbranded.com': 2,
  'https://bbcicecream.com': 2,
  'http://blkmkt.us': 1,
  'https://bowsandarrowsberkeley.com': 1,
  'https://capsuletoronto.com': 1,
  'https://cityblueshop.com': 1,
  'https://courtsidesneakers.com': 2,
  'https://deadstock.ca': 1,
  'https://dope-factory.com': 1,
  'https://featuresneakerboutique.com': 2,
  'https://ficegallery.com': 1,
  'https://footzonenyc.com': 2,
  'https://hanon-shop.com': 1, // TODO - (option 1 looks like: UK 7 : US 8)
  'https://highsandlows.net.au': 1, // TODO - (option 1 looks like: US 8)
  'https://huntinglodge.no': 1, // TODO - (option 1 looks like: US 8 - EURO 41 - CM 26, X-Large, etc.)
  'https://incu.com': 1,
  'https://k101store.com': 1,
  'https://kongonline.co.uk': 1, // TODO - (option 1 looks like: UK 7.5)
  'https://lapstoneandhammer.com': 1,
  'https://leaders1354.com': 1,
  'https://letusprosper.com': 1,
  'https://likelihood.us': 1, // TODO - (option 1 looks like: 8 M - 9.5 W)
  'https://machusonline.com': 1,
  'https://manorphx.com': 1,
  'https://marathonsports.com': 1,
  'https://minishopmadrid.com': 1, // TODO - (option 1 looks like: US 7)
  'https://notre-shop.com': 1,
  'https://oipolloi.com': 1,
  'https://onenessboutique.com': 1, // TODO - (option 1 looks like: SM, MD, LG, XL. Shoe sizes look fine)
  'https://pampamlondon.com': 1, // TODO - (option 1 looks like: UK3)
  'https://www.rooneyshop.com': 2,
  'https://saintalfred.com': 1,
  'https://eflash-sg.doverstreetmarket.com': 1,
  'https://eflash-jp.doverstreetmarket.com': 1,
  'https://eflash-us.doverstreetmarket.com': 1,
  'https://eflash.doverstreetmarket.com': 1,
  'https://sneakerworldshop.com': 1, // TODO - (option 1 looks like: US 7 - EU 40 - UK 6)
  'https://socialstatuspgh.com': 1, // TODO (option 1 small sizes appended with a 'Y' - e.g. 6Y)
  'https://solefly.com': 2,
  'https://solestop.com': 1,
  'http://usgstore.com.au': 2,
  'https://nebulabots.com': 1,
  // "http://localhost:9000": 1, // TEMPORARY for testing purposes only...
};

// Generate the correct "option<index>" from the optionIndex map
const urlToVariantOption = (function generateUTVO() {
  const utvs = {};
  Object.keys(urlToOptionIndex).forEach(key => {
    utvs[key] = `option${urlToOptionIndex[key]}`;
  });
  return utvs;
})();

// Generate the correct title segment test from the optionIndex map
const urlToTitleSegment = (function generateUTTS() {
  const utts = {};
  Object.keys(urlToOptionIndex).forEach(key => {
    // attach a function for each url
    utts[key] = title => {
      // split the title into segments based the `/` delimiter
      const segments = title.split('/');
      // Check if we have a valid number of segments
      if (segments.length >= urlToOptionIndex[key]) {
        // return the correct 0-indexed segment (trimming the surrounding whitespace)
        return segments[urlToOptionIndex[key] - 1].trim();
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

module.exports = {
  urlToOptionIndex,
  urlToTitleSegment,
  urlToVariantOption,
  validateVariantSize,
};
