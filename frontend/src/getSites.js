/*
https://rise45.com
https://rockcitykicks.com
https://rsvpgallery.com
https://shoegallerymiami.com
https://shop.bdgastore.com
https://shop.exclucitylife.com
https://shop.extrabutterny.com
https://shop.havenshop.ca
https://shop.justintimberlake.com
https://shop.travisscott.com
https://shop.undefeated.com
https://shopnicekicks.com
https://sneakerjunkiesusa.com
https://sneakerpolitics.com
https://stay-rooted.com
https://store.unionlosangeles.com
https://thesportsedit.com
https://txdxe.com
https://wishatl.com
https://www.abovethecloudsstore.com
https://www.addictmiami.com
https://amongstfew.com
https://apbstore.com
https://bbbranded.com
https://bbcicecream.com
https://www.blkmkt.us
https://bowsandarrowsberkeley.com
https://capsuletoronto.com
https://cityblueshop.com
https://courtsidesneakers.com
https://deadstock.ca
https://dope-factory.com
https://featuresneakerboutique.com
https://ficegallery.com
https://footzonenyc.com
https://goodasgold.co.nz
https://hanon-shop.com
https://highsandlows.net.au
https://hombreamsterdam.com
https://huntinglodge.no
https://incu.com
https://k101store.com
https://kongonline.co.uk
https://lapstoneandhammer.com
https://leaders1354.com
https://letusprosper.com
https://likelihood.us
https://machusonline.com
https://manorphx.com
https://marathonsports.com
https://minishopmadrid.com
https://www.notre-shop.com
https://oipolloi.com
https://www.oneness287.com
https://www.pampamlondon.com
https://www.philipbrownemenswear.co.uk

https://www.rooneyshop.com
https://saintalfred.com
https://sneakerworldshop.com
https://socialstatuspgh.com
https://solefly.com
https://soleheaven.com
https://solestop.com
http://www.usgstore.com.au
*/

const s = [
  { value: 'https://kith.com', label: 'Kith' },
  { value: 'https://12amrun.com', label: '12AM:Run' },
  { value: 'https://xhibition.co', label: 'Xhibition' },
  { value: 'https://worldofhombre.com', label: 'World of Hombre' },
  { value: 'https://westnyc.com', label: 'West NYC' },
  { value: 'https://thedarksideinitiative.com', label: 'Dark Side Initiative' },
  { value: 'https://www.us.ateaze.com', label: 'At Eaze US' },
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
  { value: 'https://blendsus.com', label: 'Blends' },
  { value: 'https://burnrubbersneakers.com', label: 'Burn Rubber' },
  { value: 'https://www.ca.ateaze.com', label: 'At Eaze CA' },
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
  { value: 'https://offthehook.ca', label: 'Off the Hook' },
  { value: 'https://packershoes.com', label: 'Packer Shoes' },
  { value: 'https://properlbc.com', label: 'Proper' },
  { value: 'https://renarts.com', label: 'Renarts' },
  { value: 'https://revengexstorm.com', label: 'Revenge x Storm' },
  { value: 'https://burnrubbersneakers.com', label: 'Burn Rubber' },
];

export default function getAllSites() {
  return s;
}

export function getSites(site) {
  return Object.assign({}, s.find(t => t.value === site));
}
