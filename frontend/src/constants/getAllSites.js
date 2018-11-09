import _ from 'underscore';

const s = [
  {
    value: 'https://kith.com', label: 'Kith', supported: true, auth: false,
  },
  {
    value: 'https://18montrose.com', label: '18 Montrose', supported: false, auth: false,
  },
  { value: 'https://us.bape.com', label: 'Bape US' },
  { value: 'https://commonwealth-ftgg.com', label: 'Common Wealth' },
  {
    value: 'https://yeezysupply.com', label: 'Yeezy Supply', supported: true, auth: false,
  },
  {
    value: 'https://funko-shop.com', label: 'Funko Shop', supported: true, auth: false,
  },
  { value: 'https://shop-usa.palaceskateboards.com/', label: 'Palace US' },
  { value: 'https://12amrun.com', label: '12AM:Run' },
  { value: 'https://xhibition.co', label: 'Xhibition' },
  { value: 'https://worldofhombre.com', label: 'World of Hombre' },
  { value: 'https://westnyc.com', label: 'West NYC' },
  {
    value: 'https://thedarksideinitiative.com', label: 'Dark Side Initiative', supported: true, auth: false,
  },
  { value: 'https://unknwn.com', label: 'Unknwn' },
  { value: 'https://thesurestore.com', label: 'Sure!' },
  { value: 'https://theclosetinc.com', label: 'Closet Clothing Co.' },
  { value: 'https://thechimpstore.com', label: 'Chimp' },
  { value: 'https://a-ma-maniere.com', label: 'A Ma Maniére' },
  { value: 'https://alifenewyork.com', label: 'Alife' },
  { value: 'https://rimenyc.com', label: 'Rime' },
  { value: 'https://stampd.com', label: 'Stampd' },
  { value: 'https://atmosny.com', label: 'Atmos' },
  { value: 'https://biancachandon.com', label: 'Bianca Chandôn' },
  {
    value: 'https://blendsus.com', label: 'Blends', supported: true, auth: false,
  },
  {
    value: 'https://burnrubbersneakers.com', label: 'Burn Rubber', supported: true, auth: false,
  },
  { value: 'https://ca.octobersveryown.com', label: 'OVO CA' },
  { value: 'https://us.octobersveryown.com', label: 'OVO US' },
  { value: 'https://centre214.com', label: 'Centre' },
  { value: 'https://cncpts.com', label: 'Concepts' },
  { value: 'https://concrete.nl', label: 'Concrete' },
  { value: 'https://creme321.com', label: 'Creme' },
  { value: 'https://doomsday-store.com', label: 'Doomsday' },
  { value: 'https://epitomeatl.com', label: 'Epitome' },
  { value: 'https://freshragsfl.com', label: 'Fresh Rags' },
  { value: 'https://justdon.com', label: 'Just Don' },
  { value: 'https://lessoneseven.com', label: 'Lessone Seven' },
  { value: 'https://noirfonce.eu', label: 'Noirfonce' },
  { value: 'https://nomadshop.net', label: 'Nomad Shop' },
  { value: 'https://nrml.ca', label: 'Normal' },
  {
    value: 'https://offthehook.ca', label: 'Off the Hook', supported: true, auth: false,
  },
  { value: 'https://packershoes.com', label: 'Packer Shoes' },
  { value: 'https://properlbc.com', label: 'Proper' },
  { value: 'https://renarts.com', label: 'Renarts' },
  { value: 'https://revengexstorm.com', label: 'Revenge x Storm' },
  { value: 'https://rise45.com', label: 'Rise' },
  { value: 'https://rockcitykicks.com', label: 'Rock City Kicks' },
  {
    value: 'https://rsvpgallery.com', label: 'RSVP Gallery', supported: true, auth: false,
  },
  { value: 'https://shoegallerymiami.com', label: 'Shoe Gallery' },
  {
    value: 'https://shop.bdgastore.com', label: 'Bodega', supported: true, auth: false,
  },
  { value: 'https://shop.exclucitylife.com', label: 'Exclucity' },
  { value: 'https://shop.extrabutterny.com', label: 'Extra Butter' },
  {
    value: 'https://shop.havenshop.ca', label: 'Haven CA', supported: true, auth: false,
  },
  { value: 'https://shop.justintimberlake.com', label: 'Justin Timberlake' },
  {
    value: 'https://shop.travisscott.com', label: 'Travis Scott', supported: true, auth: false,
  },
  {
    value: 'https://shop.undefeated.com', label: 'Undefeated', supported: true, auth: true,
  },
  {
    value: 'https://shopnicekicks.com', label: 'Shop Nice Kicks', supported: true, auth: false,
  },
  { value: 'https://sneakerjunkiesusa.com', label: 'Sneaker Junkies US' },
  { value: 'https://sneakerpolitics.com', label: 'Sneaker Politics' },
  { value: 'https://stay-rooted.com', label: 'Rooted' },
  { value: 'https://store.unionlosangeles.com', label: 'Union LA' },
  { value: 'https://thesportsedit.com', label: 'The Sports Edit' },
  { value: 'https://txdxe.com', label: 'Top Dawg Entertainment' },
  {
    value: 'https://wishatl.com', label: 'Wish Atlanta', supported: true, auth: false,
  },
  { value: 'https://abovethecloudsstore.com', label: 'Above the Cloud' },
  { value: 'https://addictmiami.com', label: 'Addict' },
  {
    value: 'https://amongstfew.com', label: 'Amongst Few', supported: true, auth: false,
  },
  { value: 'https://apbstore.com', label: 'A.P.B. Store' },
  { value: 'https://bbbranded.com', label: 'Big Baller Brand' },
  { value: 'https://bbcicecream.com', label: 'Billionaire Boys Club' },
  { value: 'http://blkmkt.us', label: 'Black Market US' },
  { value: 'https://bowsandarrowsberkeley.com', label: 'Bows & Arrows' },
  { value: 'https://capsuletoronto.com', label: 'Capsule' },
  { value: 'https://cityblueshop.com', label: 'City Blue' },
  { value: 'https://courtsidesneakers.com', label: 'Court Side Sneakers' },
  {
    value: 'https://deadstock.ca', label: 'Livestock', supported: true, auth: false,
  },
  { value: 'https://dope-factory.com', label: 'Dope Factory' },
  { value: 'https://featuresneakerboutique.com', label: 'Feature Boutique' },
  { value: 'https://ficegallery.com', label: 'Fice Gallery' },
  { value: 'https://footzonenyc.com', label: 'Foot Zone' },
  { value: 'https://goodasgold.co.nz', label: 'Good as Gold' },
  { value: 'https://hanon-shop.com', label: 'Hanon' },
  { value: 'https://highsandlows.net.au', label: 'Highs & Lows AU' },
  { value: 'https://huntinglodge.no', label: 'Hunting Lodge' },
  { value: 'https://incu.com', label: 'Incu' },
  { value: 'https://k101store.com', label: 'Kickz 101' },
  { value: 'https://kongonline.co.uk', label: 'Kong' },
  { value: 'https://lapstoneandhammer.com', label: 'Lapstone & Hammer' },
  { value: 'https://leaders1354.com', label: 'Leaders 1354' },
  { value: 'https://letusprosper.com', label: 'Prosper' },
  { value: 'https://likelihood.us', label: 'Likelihood' },
  { value: 'https://machusonline.com', label: 'Machus' },
  { value: 'https://manorphx.com', label: 'Manor' },
  { value: 'https://marathonsports.com', label: 'Marathon Sports' },
  {
    value: 'https://minishopmadrid.com', label: 'Mini Shop Madrid', supported: true, auth: false,
  },
  { value: 'https://notre-shop.com', label: 'Notre' },
  { value: 'https://oipolloi.com', label: 'Oipolloi' },
  { value: 'http://oneness287.com', label: 'Oneness' },
  { value: 'https://pampamlondon.com', label: 'Pam Pam' },
  { value: 'https://www.rooneyshop.com', label: 'Rooney' },
  { value: 'https://saintalfred.com', label: 'Saint Alfred' },
  {
    value: 'https://eflash-sg.doverstreetmarket.com', label: 'DSM SG', supported: true, auth: false,
  },
  {
    value: 'https://eflash-jp.doverstreetmarket.com', label: 'DSM JP', supported: true, auth: false,
  },
  {
    value: 'https://eflash-us.doverstreetmarket.com', label: 'DSM US', supported: true, auth: false,
  },
  {
    value: 'https://eflash.doverstreetmarket.com', label: 'DSM EU', supported: true, auth: false,
  },
  { value: 'https://sneakerworldshop.com', label: 'Sneaker World' },
  { value: 'https://socialstatuspgh.com', label: 'Social Status' },
  { value: 'https://solefly.com', label: 'Solefly' },
  { value: 'https://soleheaven.com', label: 'Sole Heaven' },
  { value: 'https://solestop.com', label: 'Sole Stop' },
  { value: 'http://usgstore.com.au', label: 'Urban Street Gear' },
];

export default function getAllSupportedSitesSorted() {
  const supported = s.filter(val => val.supported === true);
  return _.sortBy(supported, 'label');
}

export function getSite(site) {
  return s.find(t => t.value === site);
}
