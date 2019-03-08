const buildPaymentForm = (payment, billing) => ({
  credit_card: {
    number: payment.cardNumber,
    verification_value: payment.cvv,
    name: `${billing.firstName} ${billing.lastName}`,
    month: parseInt(payment.exp.slice(0, 2), 10),
    year: parseInt(payment.exp.slice(3, 5), 10),
  },
});

const patchCheckoutForm = (profile, shipping, billing, payment, captchaToken) => {
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
  if (profile.billingMatchesShipping) {
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

const addToCart = (variant, site, hash) => {
  const base = {
    id: variant,
    add: '',
  };
  let opts = {};
  switch (site.name) {
    case 'DSM US': {
      opts = { 'properties[_HASH]': hash || 256783362428 };
      break;
    }
    case 'DSM UK': {
      opts = { 'properties[_hash]': hash || 'ee3e8f7a9322eaa382e04f8539a7474c11555' };
      break;
    }
    case 'Funko Shop': {
      // TODO : figure out if this changes and we need to parse it out somewhere
      opts = { 'properties[_sELerAVIcKmA_aRCesTiVanDl_]': 'Zfq3N1cDdi1@' };
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
