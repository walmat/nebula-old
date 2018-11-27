const _ = require('underscore');

module.exports = {};

const s = [
  {
    url: 'https://kith.com',
    name: 'Kith',
    supported: true,
    auth: false,
  },
  {
    url: 'https://18montrose.com',
    name: '18 Montrose',
    supported: false,
    auth: false,
  },
  { url: 'https://us.bape.com', name: 'Bape US' },
  { url: 'https://commonwealth-ftgg.com', name: 'Common Wealth' },
  {
    url: 'https://yeezysupply.com',
    name: 'Yeezy Supply',
    supported: true,
    auth: false,
    special: true,
  },
  {
    url: 'https://funko-shop.com',
    name: 'Funko Shop',
    supported: true,
    auth: false,
  },
  { url: 'https://shop-usa.palaceskateboards.com/', name: 'Palace US' },
  { url: 'https://12amrun.com', name: '12AM:Run' },
  { url: 'https://xhibition.co', name: 'Xhibition' },
  { url: 'https://worldofhombre.com', name: 'World of Hombre' },
  { url: 'https://westnyc.com', name: 'West NYC' },
  {
    url: 'https://thedarksideinitiative.com',
    name: 'Dark Side Initiative',
    supported: true,
    auth: false,
  },
  { url: 'https://unknwn.com', name: 'Unknwn' },
  { url: 'https://thesurestore.com', name: 'Sure!' },
  { url: 'https://theclosetinc.com', name: 'Closet Clothing Co.' },
  { url: 'https://thechimpstore.com', name: 'Chimp' },
  { url: 'https://a-ma-maniere.com', name: 'A Ma Maniére' },
  { url: 'https://alifenewyork.com', name: 'Alife' },
  { url: 'https://rimenyc.com', name: 'Rime' },
  { url: 'https://stampd.com', name: 'Stampd' },
  { url: 'https://atmosny.com', name: 'Atmos' },
  { url: 'https://biancachandon.com', name: 'Bianca Chandôn' },
  {
    url: 'https://blendsus.com',
    name: 'Blends',
    supported: true,
    auth: false,
  },
  {
    url: 'https://burnrubbersneakers.com',
    name: 'Burn Rubber',
    supported: true,
    auth: false,
  },
  { url: 'https://ca.octobersveryown.com', name: 'OVO CA' },
  { url: 'https://us.octobersveryown.com', name: 'OVO US' },
  { url: 'https://centre214.com', name: 'Centre' },
  { url: 'https://cncpts.com', name: 'Concepts' },
  { url: 'https://concrete.nl', name: 'Concrete' },
  { url: 'https://creme321.com', name: 'Creme' },
  { url: 'https://doomsday-store.com', name: 'Doomsday' },
  { url: 'https://epitomeatl.com', name: 'Epitome' },
  { url: 'https://freshragsfl.com', name: 'Fresh Rags' },
  { url: 'https://justdon.com', name: 'Just Don' },
  { url: 'https://lessoneseven.com', name: 'Lessone Seven' },
  { url: 'https://noirfonce.eu', name: 'Noirfonce' },
  { url: 'https://nomadshop.net', name: 'Nomad Shop' },
  { url: 'https://nrml.ca', name: 'Normal' },
  {
    url: 'https://offthehook.ca',
    name: 'Off the Hook',
    supported: true,
    auth: false,
  },
  { url: 'https://packershoes.com', name: 'Packer Shoes' },
  { url: 'https://properlbc.com', name: 'Proper' },
  { url: 'https://renarts.com', name: 'Renarts' },
  { url: 'https://revengexstorm.com', name: 'Revenge x Storm' },
  { url: 'https://rise45.com', name: 'Rise' },
  { url: 'https://rockcitykicks.com', name: 'Rock City Kicks' },
  {
    url: 'https://rsvpgallery.com',
    name: 'RSVP Gallery',
    supported: true,
    auth: false,
  },
  { url: 'https://shoegallerymiami.com', name: 'Shoe Gallery' },
  {
    url: 'https://shop.bdgastore.com',
    name: 'Bodega',
    supported: true,
    auth: false,
  },
  { url: 'https://shop.exclucitylife.com', name: 'Exclucity' },
  { url: 'https://shop.extrabutterny.com', name: 'Extra Butter' },
  {
    url: 'https://shop.havenshop.ca',
    name: 'Haven CA',
    supported: true,
    auth: false,
  },
  { url: 'https://shop.justintimberlake.com', name: 'Justin Timberlake' },
  {
    url: 'https://shop.travisscott.com',
    name: 'Travis Scott',
    supported: true,
    auth: false,
  },
  {
    url: 'https://shop.undefeated.com',
    name: 'Undefeated',
    supported: true,
    auth: true,
  },
  {
    url: 'https://shopnicekicks.com',
    name: 'Shop Nice Kicks',
    supported: true,
    auth: false,
  },
  { url: 'https://sneakerjunkiesusa.com', name: 'Sneaker Junkies US' },
  { url: 'https://sneakerpolitics.com', name: 'Sneaker Politics' },
  { url: 'https://stay-rooted.com', name: 'Rooted' },
  { url: 'https://store.unionlosangeles.com', name: 'Union LA' },
  { url: 'https://thesportsedit.com', name: 'The Sports Edit' },
  { url: 'https://txdxe.com', name: 'Top Dawg Entertainment' },
  {
    url: 'https://wishatl.com',
    name: 'Wish Atlanta',
    supported: true,
    auth: false,
  },
  { url: 'https://abovethecloudsstore.com', name: 'Above the Cloud' },
  { url: 'https://addictmiami.com', name: 'Addict' },
  {
    url: 'https://amongstfew.com',
    name: 'Amongst Few',
    supported: true,
    auth: false,
  },
  { url: 'https://apbstore.com', name: 'A.P.B. Store' },
  { url: 'https://bbbranded.com', name: 'Big Baller Brand' },
  { url: 'https://bbcicecream.com', name: 'Billionaire Boys Club' },
  { url: 'http://blkmkt.us', name: 'Black Market US' },
  { url: 'https://bowsandarrowsberkeley.com', name: 'Bows & Arrows' },
  { url: 'https://capsuletoronto.com', name: 'Capsule' },
  { url: 'https://cityblueshop.com', name: 'City Blue' },
  { url: 'https://courtsidesneakers.com', name: 'Court Side Sneakers' },
  {
    url: 'https://deadstock.ca',
    name: 'Livestock',
    supported: true,
    auth: false,
  },
  { url: 'https://dope-factory.com', name: 'Dope Factory' },
  { url: 'https://featuresneakerboutique.com', name: 'Feature Boutique' },
  { url: 'https://ficegallery.com', name: 'Fice Gallery' },
  { url: 'https://footzonenyc.com', name: 'Foot Zone' },
  { url: 'https://goodasgold.co.nz', name: 'Good as Gold' },
  { url: 'https://hanon-shop.com', name: 'Hanon' },
  { url: 'https://highsandlows.net.au', name: 'Highs & Lows AU' },
  { url: 'https://huntinglodge.no', name: 'Hunting Lodge' },
  { url: 'https://incu.com', name: 'Incu' },
  { url: 'https://k101store.com', name: 'Kickz 101' },
  { url: 'https://kongonline.co.uk', name: 'Kong' },
  { url: 'https://lapstoneandhammer.com', name: 'Lapstone & Hammer' },
  { url: 'https://leaders1354.com', name: 'Leaders 1354' },
  { url: 'https://letusprosper.com', name: 'Prosper' },
  { url: 'https://likelihood.us', name: 'Likelihood' },
  { url: 'https://machusonline.com', name: 'Machus' },
  { url: 'https://manorphx.com', name: 'Manor' },
  { url: 'https://marathonsports.com', name: 'Marathon Sports' },
  {
    url: 'https://minishopmadrid.com',
    name: 'Mini Shop Madrid',
    supported: true,
    auth: false,
  },
  { url: 'https://notre-shop.com', name: 'Notre' },
  { url: 'https://oipolloi.com', name: 'Oipolloi' },
  { url: 'http://oneness287.com', name: 'Oneness' },
  { url: 'https://pampamlondon.com', name: 'Pam Pam' },
  { url: 'https://www.rooneyshop.com', name: 'Rooney' },
  { url: 'https://saintalfred.com', name: 'Saint Alfred' },
  {
    url: 'https://eflash-sg.doverstreetmarket.com',
    name: 'DSM SG',
    supported: true,
    auth: false,
    special: true,
  },
  {
    url: 'https://eflash-jp.doverstreetmarket.com',
    name: 'DSM JP',
    supported: true,
    auth: false,
    special: true,
  },
  {
    url: 'https://eflash-us.doverstreetmarket.com',
    name: 'DSM US',
    supported: true,
    auth: false,
    special: true,
  },
  {
    url: 'https://eflash.doverstreetmarket.com',
    name: 'DSM EU',
    supported: true,
    auth: false,
    special: true,
  },
  { url: 'https://sneakerworldshop.com', name: 'Sneaker World' },
  { url: 'https://socialstatuspgh.com', name: 'Social Status' },
  { url: 'https://solefly.com', name: 'Solefly' },
  { url: 'https://soleheaven.com', name: 'Sole Heaven' },
  { url: 'https://solestop.com', name: 'Sole Stop' },
  { url: 'http://usgstore.com.au', name: 'Urban Street Gear' },
  {
    url: 'https://nebulabots.com',
    name: 'Test Site',
    supported: true,
    auth: false,
  },
];

function getAllSupportedSites() {
  return s.filter(val => val.supported === true);
}
module.exports.getAllSupportedSites = getAllSupportedSites;

function getAllSupportedSitesSorted() {
  const supported = s.filter(val => val.supported === true);
  return _.sortBy(supported, 'name');
}
module.exports.getAllSupportedSitesSorted = getAllSupportedSitesSorted

function getAllSpecialSites() {
  return s.filter(val => val.special === true);
}
module.exports.getAllSpecialSites = getAllSpecialSites;

function isSpecialSite(site) {
  const specialSites = getAllSpecialSites();
  return !!(specialSites.find(s => s.name === site.name || s.url === site.url));
}
module.exports.isSpecialSite = isSpecialSite;
