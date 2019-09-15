const phoneFormatter = require('phone-formatter');

const buildPaymentForm = (payment, billing) => ({
  credit_card: {
    number: payment.cardNumber,
    verification_value: payment.cvv,
    name: `${billing.firstName} ${billing.lastName}`,
    month: parseInt(payment.exp.slice(0, 2), 10),
    year: parseInt(payment.exp.slice(3, 5), 10),
  },
});

const patchCheckoutForm = (billingMatchesShipping, shipping, billing, payment, captchaToken) => {
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
  if (captchaToken) {
    data['g-recaptcha-response'] = captchaToken;
  }
  return data;
};

const addToCart = (variant, name, hash, props = {}) => {
  switch (name) {
    case 'DSM US': {
      return `id=${variant}&quantity=1&properties%5B_HASH%5D=${hash}`;
    }
    case 'DSM UK': {
      return JSON.stringify({
        id: variant,
        quantity: 1,
        'properties%5B_hash%5D': hash || 'ee3e8f7a9322eaa382e04f8539a7474c11555',
      });
    }
    case 'Funko Shop': {
      return JSON.stringify({
        id: variant,
        quantity: 1,
        'properties%5B_sELerAVIcKmA_aRCesTiVanDl_%5D': 'Zfq3N1cDdi1',
      });
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
    default:
      break;
  }
  return JSON.stringify({
    id: variant,
    quantity: 1,
  });
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

module.exports = {
  buildPaymentForm,
  patchCheckoutForm,
  addToCart,
  patchToCart,
};
