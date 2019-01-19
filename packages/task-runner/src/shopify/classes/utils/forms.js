/* eslint-disable no-nested-ternary */
const phoneFormatter = require('phone-formatter');
const { getRandomIntInclusive } = require('../utils/');

const buildPaymentForm = (payment, billing) => ({
  credit_card: {
    number: payment.cardNumber,
    verification_value: payment.cvv,
    name: `${billing.firstName} ${billing.lastName}`,
    month: parseInt(payment.exp.slice(0, 2), 10),
    year: parseInt(payment.exp.slice(3, 5), 10),
  },
});

const createCheckoutForm = (profile, shipping, billing, payment) => {
  let dataString;
  const shippingProvinceValue = shipping.province ? shipping.province.value : '';
  if (profile.billingMatchesShipping) {
    dataString = `{"card_source":"vault","pollingOptions":{"poll":false},"checkout":{"wallet_name":"default","secret":true,"is_upstream_button":true,"email":"${
      payment.email
    }","shipping_address":{"first_name":"${shipping.firstName}","last_name":"${
      shipping.lastName
    }","address1":"${shipping.address}","address2":"${shipping.apt}","company":null,"city":"${
      shipping.city
    }","country_code":"${
      shipping.country.value
    }","province_code":"${shippingProvinceValue}","phone":"${phoneFormatter.format(
      shipping.phone,
      '(NNN) NNN-NNNN',
    )}","zip":"${shipping.zipCode}"},"billing_address":{"first_name":"${
      shipping.firstName
    }","last_name":"${shipping.lastName}","address1":"${shipping.address}","address2":"${
      shipping.apt
    }","company":null,"city":"${shipping.city}","country_code":"${
      shipping.country.value
    }","province_code":"${shippingProvinceValue}","phone":"${phoneFormatter.format(
      shipping.phone,
      '(NNN) NNN-NNNN',
    )}","zip":"${shipping.zipCode}"}}}`;
  } else {
    const billingProvinceValue = billing.province ? billing.province.value : '';
    dataString = `{"card_source":"vault","pollingOptions":{"poll":false},"checkout":{"wallet_name":"default","secret":true,"is_upstream_button":true,"email":"${
      payment.email
    }","shipping_address":{"first_name":"${shipping.firstName}","last_name":"${
      shipping.lastName
    }","address1":"${shipping.address}","address2":"${shipping.apt}","company":null,"city":"${
      shipping.city
    }","country_code":"${
      shipping.country.value
    }","province_code":"${shippingProvinceValue}","phone":"${phoneFormatter.format(
      shipping.phone,
      '(NNN) NNN-NNNN',
    )}","zip":"${shipping.zipCode}"},"billing_address":{"first_name":"${
      billing.firstName
    }","last_name":"${billing.lastName}","address1":"${billing.address}","address2":"${
      billing.apt
    }","company":null,"city":"${billing.city}","country_code":"${
      billing.country.value
    }","province_code":"${billingProvinceValue}","phone":"${phoneFormatter.format(
      billing.phone,
      '(NNN) NNN-NNNN',
    )}","zip":"${billing.zipCode}"}}}`;
  }
  return dataString;
};

const addToCart = (variant, site) => {
  const base = {
    id: variant,
    add: '',
  };
  let opts = {};
  switch (site.name) {
    case 'DSM US': {
      opts = { 'properties[_HASH]': 256782537687 };
      break;
    }
    case 'DSM UK': {
      opts = { 'properties[_hash]': 'ee3e8f7a9322eaa382e04f8539a7474c11555' };
      break;
    }
    default:
      break;
  }
  return {
    ...base,
    ...opts,
  };
};

const patchToCart = (variant, site) => ({
  checkout: {
    line_items: [
      {
        variant_id: variant,
        quantity: '1',
        properties:
          site.name === 'DSM US'
            ? {
                _HASH: '256779527127',
              }
            : site.name === 'DSM EU'
            ? {
                _hash: '', // TODO – find this
              }
            : {},
      },
    ],
  },
});

const submitCustomerInformation = (payment, shipping, authToken, captchaToken) => ({
  utf8: '✓',
  _method: 'patch',
  authenticity_token: authToken,
  previous_step: '',
  'checkout[email]': payment.email,
  'checkout[buyer_accepts_marketing]': 0,
  'checkout[shipping_address][first_name]': shipping.firstName,
  'checkout[shipping_address][last_name]': shipping.lastName,
  'checkout[shipping_address][address1]': shipping.address,
  'checkout[shipping_address][address2]': shipping.apt,
  'checkout[shipping_address][city]': shipping.city,
  'checkout[shipping_address][country]': shipping.country.label,
  'checkout[shipping_address][province]': shipping.province ? shipping.province.label : '',
  'checkout[shipping_address][zip]': shipping.zipCode,
  'checkout[shipping_address][phone]': phoneFormatter.format(shipping.phone, '(NNN) NNN-NNNN'),
  step: 'shipping_method',
  'g-captcha-response': captchaToken,
  'checkout[client_details][browser_width]': getRandomIntInclusive(900, 970),
  'checkout[client_details][browser_height]': getRandomIntInclusive(600, 670),
  'checkout[client_details][javascript_enabled]': '1',
  'checkout[remember_me]': '0',
  button: '',
});

const postPaymentAPI = (paymentToken, gateway, shippingMethod, captchaToken) => ({
  utf8: '✓',
  _method: 'patch',
  authenticity_token: '',
  previous_step: 'payment_method',
  step: '',
  s: paymentToken,
  'checkout[payment_gateway]': gateway,
  'checkout[remember_me]': '0',
  'checkout[total_price]': '',
  complete: '1',
  'checkout[client_details][browser_width]': getRandomIntInclusive(900, 970),
  'checkout[client_details][browser_height]': getRandomIntInclusive(600, 670),
  'checkout[client_details][javascript_enabled]': '1',
  'checkout[buyer_accepts_marketing]': '0',
  'checkout[shipping_rate][id]': shippingMethod,
  button: '',
  'g-recaptcha-response': captchaToken,
});

const postPaymentFrontend = (
  paymentToken,
  gateway,
  shippingMethod,
  captchaToken,
  price,
  profile,
) => {
  if (profile.billingMatchesShipping) {
    const { shipping } = profile;

    let shippingProvince = '';
    if (shipping.province) {
      shippingProvince = shipping.province.label;
    }

    return {
      utf8: '✓',
      _method: 'patch',
      authenticity_token: '',
      previous_step: 'payment_method',
      step: '',
      s: paymentToken,
      'checkout[payment_gateway]': gateway,
      'checkout[credit_card][vault]': 'false',
      'checkout[different_billing_address]': 'false',
      'checkout[billing_address][first_name]': shipping.firstName,
      'checkout[billing_address][last_name]': shipping.lastName,
      'checkout[billing_address][company]': '',
      'checkout[billing_address][address1]': shipping.address,
      'checkout[billing_address][address2]': shipping.apt,
      'checkout[billing_address][city]': shipping.city,
      'checkout[billing_address][country]': shipping.country.label,
      'checkout[billing_address][province]': shippingProvince,
      'checkout[billing_address][zip]': shipping.zipCode,
      'checkout[billing_address][phone]': shipping.phone,
      'checkout[remember_me]': '0',
      'checkout[total_price]': price,
      complete: '1',
      'checkout[client_details][browser_width]': getRandomIntInclusive(900, 970),
      'checkout[client_details][browser_height]': getRandomIntInclusive(600, 670),
      'checkout[client_details][javascript_enabled]': '1',
      'checkout[buyer_accepts_marketing]': '0',
      'checkout[shipping_rate][id]': shippingMethod,
      button: '',
      'g-recaptcha-response': captchaToken,
    };
  }
  const { billing } = profile;

  let billingProvince = '';
  if (billing.province) {
    billingProvince = billing.province.label;
  }

  return {
    utf8: '✓',
    _method: 'patch',
    authenticity_token: '',
    previous_step: 'payment_method',
    step: '',
    s: paymentToken,
    'checkout[payment_gateway]': gateway,
    'checkout[credit_card][vault]': 'false',
    'checkout[different_billing_address]': 'false',
    'checkout[billing_address][first_name]': billing.firstName,
    'checkout[billing_address][last_name]': billing.lastName,
    'checkout[billing_address][company]': '',
    'checkout[billing_address][address1]': billing.address,
    'checkout[billing_address][address2]': billing.apt,
    'checkout[billing_address][city]': billing.city,
    'checkout[billing_address][country]': billing.country.label,
    'checkout[billing_address][province]': billingProvince,
    'checkout[billing_address][zip]': billing.zip,
    'checkout[billing_address][phone]': billing.phone,
    'checkout[remember_me]': '0',
    'checkout[total_price]': price,
    complete: '1',
    'checkout[client_details][browser_width]': getRandomIntInclusive(900, 970),
    'checkout[client_details][browser_height]': getRandomIntInclusive(600, 670),
    'checkout[client_details][javascript_enabled]': '1',
    'checkout[buyer_accepts_marketing]': '0',
    'checkout[shipping_rate][id]': shippingMethod,
    button: '',
    'g-recaptcha-response': captchaToken,
  };
};

/**
 * NOTE – Price is not needed as of now,
 * but it's tracked in case it's ever needed in the future
 */
const paymentReviewForm = (price, captchaToken) => ({
  utf8: '✓',
  _method: 'patch',
  authenticity_token: '',
  'checkout[total_price]': '',
  complete: '1',
  button: '',
  'checkout[client_details][browser_width]': getRandomIntInclusive(900, 970),
  'checkout[client_details][browser_height]': getRandomIntInclusive(600, 670),
  'checkout[client_details][javascript_enabled]': '1',
  'g-recaptcha-response': captchaToken,
});

module.exports = {
  buildPaymentForm,
  createCheckoutForm,
  addToCart,
  patchToCart,
  submitCustomerInformation,
  postPaymentAPI,
  postPaymentFrontend,
  paymentReviewForm,
};
