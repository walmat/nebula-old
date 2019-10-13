/* eslint-disable no-nested-ternary */
const { URLSearchParams } = require('url');
const { States } = require('./constants').TaskRunner;

const patchCheckoutForm = (
  billingMatchesShipping,
  shipping,
  billing,
  payment,
  variant,
  name,
  hash,
) => {
  const shippingProvinceValue = shipping.province ? shipping.province.value : '';
  let data = {
    complete: '1',
    checkout: {
      secret: true,
      email: payment.email,
      shipping_address: {
        first_name: shipping.firstName,
        last_name: shipping.lastName,
        address1: shipping.address,
        address2: shipping.apt,
        city: shipping.city,
        country: shipping.country.value,
        province: shippingProvinceValue,
        state: shippingProvinceValue,
        zip: shipping.zipCode,
        phone: shipping.phone,
      },
    },
  };
  if (billingMatchesShipping) {
    data = {
      ...data,
      checkout: {
        ...data.checkout,
        billing_address: {
          first_name: shipping.firstName,
          last_name: shipping.lastName,
          address1: shipping.address,
          address2: shipping.apt,
          city: shipping.city,
          country: shipping.country.value,
          province: shippingProvinceValue,
          state: shippingProvinceValue,
          zip: shipping.zipCode,
          phone: shipping.phone,
        },
      },
    };
  } else {
    const billingProvinceValue = billing.province ? billing.province.value : '';
    data = {
      ...data,
      checkout: {
        ...data.checkout,
        billing_address: {
          first_name: billing.firstName,
          last_name: billing.lastName,
          address1: billing.address,
          address2: billing.apt,
          city: billing.city,
          country: billing.country.value,
          province: billingProvinceValue,
          state: billingProvinceValue,
          zip: billing.zipCode,
          phone: billing.phone,
        },
      },
    };
  }

  if (variant) {
    data = {
      ...data,
      checkout: {
        ...data.checkout,
        line_items: [
          {
            variant_id: variant,
            quantity: 1,
            properties: /dsm uk/i.test(name)
              ? {
                  _hash: hash,
                }
              : /dsm us/i.test(name)
              ? {
                  _HASH: hash,
                }
              : {},
          },
        ],
      },
    };
  }

  return data;
};

const addToCart = (variant, name, hash, props = {}) => {
  const params = new URLSearchParams();
  params.append('id', variant);
  params.append('quantity', 1);
  switch (name) {
    case 'DSM US': {
      return `id=${variant}&quantity=1&properties%5B_HASH%5D=${hash}`;
    }
    case 'DSM UK': {
      params.append('properties[_hash]', hash || 'ee3e8f7a9322eaa382e04f8539a7474c11555');
      return params;
    }
    case 'Funko Shop': {
      params.append('properties[_sELerAVIcKmA_aRCesTiVanDl_]', 'Zfq3N1cDdi1');
      return params;
    }
    case 'Yeezy Supply': {
      return JSON.stringify({
        id: variant,
        properties: {
          ...props,
        },
        quantity: 1,
      });
    }
    case 'eraserfase.com': {
      return JSON.stringify({
        id: variant,
        quantity: 1,
        success: undefined,
      });
    }
    default:
      return JSON.stringify({
        id: variant,
        quantity: 1,
      });
  }
};

const patchToCart = variant => ({
  checkout: {
    line_items: [
      {
        variant_id: variant,
        quantity: '1',
        properties: {},
      },
    ],
  },
});

const parseForm = async ($, state, checkoutToken, profile, formName, wanted) => {
  let count = 0;
  const data = [];
  await $(formName).each((i, form) => {
    if ($(form).children().length > 4) {
      const fields = $(form).find(wanted);

      $(fields).each((_, el) => {
        const name = $(el).attr('name');
        let value = $(el).attr('value') || '';

        // keep a count of the number of hashes!
        if (/[a-fA-F0-9]{32}/.test(name)) {
          count += 1;
        }

        if (name === 's') {
          data.push({ name, value: '' });
          return;
        }

        if (/vault_phone|authenticity_token/i.test(name)) {
          value = encodeURIComponent(value);
        }

        // just set the dba to true and fill the rest of the form
        if (/different_billing_address/i.test(name)) {
          value = !profile.billingMatchesShipping;
        }

        if (/recaptcha/i.test(name)) {
          return;
        }

        if (
          (profile.billingMatchesShipping &&
            data.some(({ name: existing }) => /shipping_address/i.test(existing)) &&
            /billing_address/i.test(name) &&
            !/different_billing_address/i.test(name)) ||
          (/different_billing_address/i.test(name) &&
            data.some(({ name: existing }) => /different_billing_address/i.test(existing)))
        ) {
          return;
        }

        // prevent multiple buttons from being included...
        if (/button/i.test(name)) {
          if (state === States.GO_TO_PAYMENT) {
            return;
          }

          if (data.some(({ name: existing }) => /button/i.test(existing))) {
            return;
          }
        }

        if (/shipping_rate/i.test(name)) {
          if (data.some(({ name: existing }) => /shipping_rate/i.test(existing))) {
            return;
          }
          value = encodeURIComponent(value);
        }

        if (
          /hosted_fields_redirect|field_start|field_end/i.test(name) ||
          ((/payment_gateway/i.test(name) && /free|3700574/i.test(value)) ||
            (/payment_gateway/i.test(name) &&
              data.some(({ name: existing }) => /payment_gateway/i.test(existing))))
        ) {
          // added check for the field_end to patch in the count...
          if (/field_end/i.test(name)) {
            data.push({
              name: `${checkoutToken}-count`,
              value: count,
            });
          }
          return;
        }

        if (name) {
          data.push({ name, value });
        }
      });
    }
  });

  if (!data.some(({ name: existing }) => /client_details/i.test(existing))) {
    // push things that aren't found, but might be needed...
    data.push({ name: 'checkout[client_details][browser_width]', value: 1238 });
    data.push({ name: 'checkout[client_details][browser_height]', value: 453 });
    data.push({ name: 'checkout[client_details][javascript_enabled]', value: 1 });
    data.push({ name: 'checkout[client_details][color_depth]', value: 24 });
    data.push({ name: 'checkout[client_details][java_enabled]', value: false });
    data.push({ name: 'checkout[client_details][browser_tz]', value: 240 });
  }

  const billingInfo = profile.billingMatchesShipping ? profile.shipping : profile.billing;

  const formValuesObj = {
    'checkout[email]': encodeURIComponent(profile.payment.email),
    'checkout[email_or_phone]': encodeURIComponent(profile.payment.email),
    'checkout[shipping_address][first_name]': profile.shipping.firstName,
    'checkout[shipping_address][last_name]': profile.shipping.lastName,
    'checkout[shipping_address][address1]': profile.shipping.address,
    'checkout[shipping_address][address2]': profile.shipping.apt,
    'checkout[shipping_address][city]': profile.shipping.city,
    'checkout[shipping_address][country]': profile.shipping.country.label,
    'checkout[shipping_address][province]': profile.shipping.province
      ? profile.shipping.province.value
      : '',
    'checkout[shipping_address][zip]': profile.shipping.zipCode,
    'checkout[shipping_address][phone]': profile.shipping.phone,
    'checkout[billing_address][first_name]': billingInfo.firstName,
    'checkout[billing_address][last_name]': billingInfo.lastName,
    'checkout[billing_address][address1]': billingInfo.address,
    'checkout[billing_address][address2]': billingInfo.apt,
    'checkout[billing_address][city]': billingInfo.city,
    'checkout[billing_address][country]': billingInfo.country.label,
    'checkout[billing_address][province]': billingInfo.province ? billingInfo.province.value : '',
    'checkout[billing_address][zip]': billingInfo.zipCode,
    'checkout[billing_address][phone]': billingInfo.phone,
  };

  const formValues = await data.map(({ name, value }) => {
    let val = value.toString();

    const predictedVal = formValuesObj[name];
    if (predictedVal) {
      val = predictedVal;
    }

    if (!val) {
      return `${encodeURI(name)}=&`;
    }

    val = val.replace(/\s/g, '+');
    return `${encodeURI(name)}=${val}&`;
  });

  console.log(formValues);
  return formValues.join('').slice(0, -1);
};

module.exports = {
  patchCheckoutForm,
  addToCart,
  patchToCart,
  parseForm,
};
