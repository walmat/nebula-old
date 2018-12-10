const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

var headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,und;q=0.8',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3107.4 Safari/537.36',
  'host': 'kith.com',
  'cookie': '_shopify_y=1f2261ba-cda9-4d05-a201-c530440ca585; _orig_referrer=; secure_customer_sig=; _landing_page=%2Fcollections%2Ffootwear%2Fproducts%2Fnike-air-jordan-12-retro-gym-red-black; cart_sig=; _secure_session_id=6a81c7fa821fc501b88da259028e3104'
};

var options = {
  url: 'https://kith.com/collections/footwear/products/nike-air-jordan-12-retro-gym-red-black',
  method: 'get',
  headers: headers,
  resolveWithFullResponse: true,
};

rp(options).then((res) => {
  console.log(res.request.headers);
});


