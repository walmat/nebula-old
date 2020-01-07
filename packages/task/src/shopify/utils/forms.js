/* eslint-disable no-nested-ternary */
import { Task as TaskConstants } from '../constants';

const { States } = TaskConstants;

export const patchCheckoutForm = (matches, shipping, billing, payment, variant, name, hash) => {
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
        zip: shipping.zip,
        phone: shipping.phone,
      },
    },
  };
  if (matches) {
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
          zip: shipping.zip,
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
          zip: billing.zip,
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

export const addToCart = (variant, name, hash, props = {}) => {
  switch (name) {
    case 'DSM US': {
      return `id=${variant}&quantity=1&properties%5B_HASH%5D=${hash}`;
    }
    case 'DSM UK': {
      return `id=${variant}&add=&properties%5B_hash%5D=${hash ||
        'ee3e8f7a9322eaa382e04f8539a7474c11555'}`;
    }
    case 'Funko Shop': {
      return `id=${variant}&quantity=1&properties%5B_sELerAVIcKmA_aRCesTiVanDl_%5D=Zfq3N1cDdi1`;
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

export const patchToCart = variant => ({
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

export const parseForm = async ($, state, checkoutToken, profile, formName, wanted) => {
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
          value = !profile.matches;
        }

        if (/recaptcha/i.test(name)) {
          return;
        }

        if (
          (profile.matches &&
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
          (/payment_gateway/i.test(name) && /free|3700574/i.test(value)) ||
          (/payment_gateway/i.test(name) &&
            data.some(({ name: existing }) => /payment_gateway/i.test(existing)))
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

  const billingInfo = profile.matches ? profile.shipping : profile.billing;

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
    'checkout[shipping_address][zip]': profile.shipping.zip,
    'checkout[shipping_address][phone]': profile.shipping.phone,
    'checkout[billing_address][first_name]': billingInfo.firstName,
    'checkout[billing_address][last_name]': billingInfo.lastName,
    'checkout[billing_address][address1]': billingInfo.address,
    'checkout[billing_address][address2]': billingInfo.apt,
    'checkout[billing_address][city]': billingInfo.city,
    'checkout[billing_address][country]': billingInfo.country.label,
    'checkout[billing_address][province]': billingInfo.province ? billingInfo.province.value : '',
    'checkout[billing_address][zip]': billingInfo.zip,
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

  return formValues.join('').slice(0, -1);
};

export const contactForm = (profile, captchaToken) => {
  let form = `_method=patch&authenticity_token=&previous_step=contact_information&step=shipping_method&checkout%5Bemail%5D=${email}&checkout%5Bshipping_address%5D%5Bfirst_name%5D=${firstName}&checkout%5Bshipping_address%5D%5Blast_name%5D=${lastName}&checkout%5Bshipping_address%5D%5Bcompany%5D=&checkout%5Bshipping_address%5D%5Baddress1%5D=${address}&checkout%5Bshipping_address%5D%5Baddress2%5D=${apt}&checkout%5Bshipping_address%5D%5Bcity%5D=${city}&checkout%5Bshipping_address%5D%5Bcountry%5D=${country.label}&checkout%5Bshipping_address%5D%5Bprovince%5D=${provinceValue}&checkout%5Bshipping_address%5D%5Bzip%5D=${zip}&checkout%5Bshipping_address%5D%5Bphone%5D=${phone}&checkout%5Bshipping_address%5D%5Bfirst_name%5D=${firstName}&checkout%5Bshipping_address%5D%5Blast_name%5D=${lastName}&checkout%5Bshipping_address%5D%5Bcompany%5D=&checkout%5Bshipping_address%5D%5Baddress1%5D=${address}&checkout%5Bshipping_address%5D%5Baddress2%5D=${apt}&checkout%5Bshipping_address%5D%5Bcity%5D=${city}&checkout%5Bshipping_address%5D%5Bcountry%5D=${country.label}&checkout%5Bshipping_address%5D%5Bprovince%5D=${provinceValue}&checkout%5Bshipping_address%5D%5Bzip%5D=${zip}&checkout%5Bshipping_address%5D%5Bphone%5D=${phone}&checkout%5Bremember_me%5D=&checkout%5Bremember_me%5D=0&checkout%5Bremember_me%5D=1`;

  if (captchaToken) {
    form += `&g-recaptcha-response=${captchaToken}`;
  }

  form += `&checkout%5Bclient_details%5D%5Bbrowser_width%5D=1238&checkout%5Bclient_details%5D%5Bbrowser_height%5D=453&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1&checkout%5Bclient_details%5D%5Bcolor_depth%5D=24&checkout%5Bclient_details%5D%5Bjava_enabled%5D=false&checkout%5Bclient_details%5D%5Bbrowser_tz%5D=240`;

  return form.replace(/\s/g, '+');
};

export const shippingForm = rate =>
  `__method=patch&authenticity_token=&previous_step=shipping_method&step=payment_method&checkout%5Bshipping_rate%5D%5Bid%5D=${encodeURIComponent(
    rate,
  )}&button=&checkout%5Bclient_details%5D%5Bbrowser_width%5D=927&checkout%5Bclient_details%5D%5Bbrowser_height%5D=967&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1`;

export const paymentForm = (profile, s) => {
  const { matches, billing } = profile;
  const { firstName, lastName, address, province, country, city, apt, zip, phone } = billing;

  const provinceValue = province ? province.value : '';

  const form = `_method=patch&authenticity_token=&previous_step=payment_method&step=&s=${s}&checkout%5Bpayment_gateway%5D=&checkout%5Bcredit_card%5D%5Bvault%5D=false&checkout%5Bdifferent_billing_address%5D=${!matches}&checkout%5Bbilling_address%5D%5Bfirst_name%5D=${firstName}&checkout%5Bbilling_address%5D%5Blast_name%5D=${lastName}&checkout%5Bbilling_address%5D%5Bcompany%5D=&checkout%5Bbilling_address%5D%5Baddress1%5D=${address}&checkout%5Bbilling_address%5D%5Baddress2%5D=${apt}&checkout%5Bbilling_address%5D%5Bcity%5D=${city}&checkout%5Bbilling_address%5D%5Bcountry%5D=${
    country.label
  }&checkout%5Bbilling_address%5D%5Bprovince%5D=${provinceValue}&checkout%5Bbilling_address%5D%5Bzip%5D=${zip}&checkout%5Bbilling_address%5D%5Bphone%5D=${phone}&checkout%5Bbilling_address%5D%5Bfirst_name%5D=${firstName}&checkout%5Bbilling_address%5D%5Blast_name%5D=${lastName}&checkout%5Bbilling_address%5D%5Bcompany%5D=&checkout%5Bbilling_address%5D%5Baddress1%5D=${address}&checkout%5Bbilling_address%5D%5Baddress2%5D=${apt}&checkout%5Bbilling_address%5D%5Bcity%5D=${city}&checkout%5Bbilling_address%5D%5Bcountry%5D=${
    country.label
  }&checkout%5Bbilling_address%5D%5Bprovince%5D=${provinceValue}&checkout%5Bbilling_address%5D%5Bzip%5D=${zip}&checkout%5Bbilling_address%5D%5Bphone%5D=${phone}&checkout%5Btotal_price%5D=&complete=1&checkout%5Bclient_details%5D%5Bbrowser_width%5D=1238&checkout%5Bclient_details%5D%5Bbrowser_height%5D=453&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1&checkout%5Bclient_details%5D%5Bcolor_depth%5D=24&checkout%5Bclient_details%5D%5Bjava_enabled%5D=false&checkout%5Bclient_details%5D%5Bbrowser_tz%5D=240`;

  return form.replace(/\s/g, '+');
};
