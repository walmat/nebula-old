const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});
const {
  userAgent,
} = require('../classes/utils');
const tough = require('tough-cookie');

const info = {
  email: 'test@test.com',
  buyer_accepts_marketing: 0,
  shipping_address: {
    first_name: 'Test',
    last_name: 'Test2',
    address1: '123 Test blvd',
    address2: '',
    city: 'Cedar Falls',
    country: 'United States',
    province: 'Iowa',
    zip: '50613',
    phone: '(319) 123-4534', 
  },
}

const url_base = 'http://www.blendsus.com';

// THESE VARIABLES ARE SPECIFIC EACH TIME
const checkout_url = 'https://www.blendsus.com/1529745/checkouts/cdd7a5b395e0eaf9a5d204ba730ff670';
const authenticity_token = 'uJsNxvtbEOFT8aDTXo74UBiXYzEihFaL9kxe+R7T6UzrRKgqUOkireubdngEG3B/qwkBm68CnfmLjQ4Z+XXyWw==';
const cookies = [
  '_shopify_s=e28434d2-315A-4AAE-56C3-8514B47B7A4F; path=/; expires=Mon, 05 Nov 2018 07:09:47 -0000',
  '_shopify_y=b627374a-5254-441f-a6ad-146f78f0b6d9; path=/; expires=Wed, 04 Nov 2020 18:18:11 -0000',
  'checkout_token=eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaEpJaVZqWkdRM1lUVmlNemsxWlRCbFlXWTVZVFZrTWpBMFltRTNNekJtWmpZM01BWTZCa1ZVIiwiZXhwIjoiMjAxOS0xMS0wNVQwNjozOTo0Ny4wMjFaIiwicHVyIjpudWxsfX0%3D--57eace6ae62e4dc3b49cc114b1c436367c89eeb8; path=/1529745; expires=Tue, 05 Nov 2019 06:39:47 -0000; secure; HttpOnly',
  'checkout=eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaEpJaVV6WTJOa01tUTROREZqTVdabVpUSmtNR1kwWlRZNU1USTJPRGsyTmpZME53WTZCa1ZVIiwiZXhwIjoiMjAxOC0xMS0yNlQwNjozOTo0Ny4wMjFaIiwicHVyIjpudWxsfX0%3D--939283e3923041b04449c017d88b8090d63313d0; path=/1529745/checkouts/cdd7a5b395e0eaf9a5d204ba730ff670; expires=Mon, 26 Nov 2018 06:39:47 -0000; secure; HttpOnly',
].map(tough.Cookie.parse);
// End Group

cookies.forEach((c) => jar.setCookie(c, url_base));

const generateFormData = () => {
  return {
    "utf8": encodeURIComponent("✓"),
    "_method": "patch",
    "authenticity_token": (authenticity_token),
    "previous_step": "contact_information",
    "checkout[email]": (info.email),
    "checkout[buyer_accepts_marketing]": '0',
    "checkout[shipping_address][first_name]": (info.shipping_address.first_name),
    "checkout[shipping_address][last_name]": (info.shipping_address.last_name),
    "checkout[shipping_address][address1]": (info.shipping_address.address1),
    "checkout[shipping_address][address2]": (info.shipping_address.address2),
    "checkout[shipping_address][city]": (info.shipping_address.city),
    "checkout[shipping_address][country]": (info.shipping_address.country),
    "checkout[shipping_address][province]": (info.shipping_address.province),
    "checkout[shipping_address][zip]": (info.shipping_address.zip),
    "checkout[shipping_address][phone]": (info.shipping_address.phone),
    "step": "contact_information",
    "button": ''
  };
};

rp({
  uri: checkout_url,
  method: 'get',
  followAllRedirects: false,
  resolveWithFullResponse: true,
  simple: true,
  headers: {
    Origin: 'https://blendsus.com',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent': userAgent,
    Referer: `https://blendsus.com/cart`,
  },
  qs: generateFormData(),
}).then((res) => {
  console.log(res.body);
}).catch((error) => {
  console.log(error.statusCode);
});