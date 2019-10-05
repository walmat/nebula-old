const validator = require('card-validator');
const phoneFormatter = require('phone-formatter');

const ATC = (size, style, siteName) => {
  if (/eu/i.test(siteName)) {
    return `size=${size}&style=${style}&qty=1`;
  }
  if (/us/i.test(siteName)) {
    return `s=${size}&st=${style}&qty=1`;
  }
  return `s=${size}&st=${style}&qty=1`;
};

const parseForm = async ($, formName, wanted, billing, payment, size) => {
  const data = [];

  await $(`${formName} ${wanted}`).each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).attr('value') || '';

    // blacklisted values/names
    if (/qty|size-options/i.test(name)) {
      return;
    }

    if (name) {
      data.push({ name, value });
    }
  });

  const formValues = data.map(({ name, value }) => {
    let val = value.toString();
    if (/email/i.test(name)) {
      val = encodeURIComponent(payment.email);
    }
    if (/tel/i.test(name)) {
      val = phoneFormatter.format(billing.phone, 'NNN-NNN-NNNN');
    }
    if (/address/i.test(name) && !/same|store/i.test(name)) {
      if (!/2|3/i.test(name)) {
        val = billing.address.replace(/\s/g, '+');
      } else if (/2/i.test(name)) {
        val = billing.apt ? billing.apt.replace(/\s/g, '+') : '';
      }
    }
    if (/zip/i.test(name)) {
      val = billing.zipCode;
    }
    if (/city/i.test(name)) {
      val = billing.city.replace(/\s/g, '+');
    }
    if (/state/i.test(name)) {
      val = billing.province ? billing.province.value.replace(/\s/g, '+') : '';
    }
    if (/country/i.test(name)) {
      val = billing.country.value;
    }
    if (/bn|name/i.test(name)) {
      const fullName = `${billing.firstName.replace(/\s/g, '+')}+${billing.lastName.replace(
        /\s/g,
        '+',
      )}`;
      val = fullName;
    }
    if (/carn|card/i.test(name) && !/month|year|vv|type/i.test(name)) {
      val = payment.cardNumber.match(/.{1,4}/g).join('+');
    }
    if (/card/i.test(name) && /month/i.test(name)) {
      let month = payment.exp.slice(0, 2);
      if (month.length !== 2) {
        month = `0${month}`;
      }
      val = month;
    }
    if (/card/i.test(name) && /year/i.test(name)) {
      val = `20${payment.exp.slice(3, 5)}`;
    }
    if (/card/i.test(name) && /type/i.test(name)) {
      const validNumber = validator.number(payment.cardNumber);
      let cardType = validNumber.card ? validNumber.card.type : 'visa';
      if (/american/i.test(cardType)) {
        cardType = 'american_express';
      }
      if (/master/i.test(cardType)) {
        cardType = 'master';
      }
    }
    if (/card/i.test(name) && /vv/i.test(name)) {
      val = payment.cvv;
    }
    if (/cookie-sub/i.test(name)) {
      // NOTE: disable this ESLint error, as we can't include the spaces here!!
      // eslint-disable-next-line prettier/prettier
      val = encodeURIComponent(JSON.stringify({ [size]: 1 }));
    }
    if (!val) {
      return `${encodeURI(name)}=&`;
    }
    return `${encodeURI(name)}=${val}&`;
  });

  return formValues.join('').slice(0, -1);
};

const backupForm = (region, billing, payment, size) => {
  let form = '';
  const fullName = `${billing.firstName.replace(/\s/g, '+')}+${billing.lastName.replace(
    /\s/g,
    '+',
  )}`;

  const card = payment.cardNumber.match(/.{1,4}/g).join('+');
  const month =
    payment.exp.slice(0, 2).length < 2 ? `0${payment.exp.slice(0, 2)}` : payment.exp.slice(0, 2);
  const year = `20${payment.exp.slice(3, 5)}`;
  const country = /US/i.test(region) ? 'USA' : 'GB';
  // NOTE: we can't include the spaces here!!
  // eslint-disable-next-line prettier/prettier
  const cookieSub = encodeURIComponent(JSON.stringify({[size]:1}));

  switch (region) {
    case 'US': {
      form = `store_credit_id=&from_mobile=1&cookie-sub=${encodeURIComponent(
        cookieSub,
      )}&same_as_billing_address=1&order%5Bbilling_name%5D=&order%5Bbn%5D=${fullName}&order%5Bemail%5D=${encodeURIComponent(
        payment.email,
      )}&order%5Btel%5D=${phoneFormatter.format(
        billing.phone,
        'NNN-NNN-NNNN',
      )}&order%5Bbilling_address%5D=${billing.address.replace(
        /\s/g,
        '+',
      )}&order%5Bbilling_address_2%5D=${
        billing.apt ? billing.apt.replace(/\s/g, '+') : ''
      }&order%5Bbilling_zip%5D=${billing.zipCode.replace(
        /\s/g,
        '+',
      )}&order%5Bbilling_city%5D=${billing.city.replace(/\s/g, '+')}&order%5Bbilling_state%5D=${
        billing.province ? billing.province.value.replace(/\s/g, '+') : ''
      }&order%5Bbilling_country%5D=${country}&carn=${card}&credit_card%5Bmonth%5D=${month}&credit_card%5Byear%5D=${year}&credit_card%5Bvvv%5D=${
        payment.cvv
      }&order%5Bterms%5D=0&order%5Bterms%5D=1`;
      break;
    }
    case 'EU': {
      const validNumber = validator.number(payment.cardNumber);
      let cardType = validNumber.card ? validNumber.card.type : 'visa';
      if (/american/i.test(cardType)) {
        cardType = 'american_express';
      }

      if (/master/i.test(cardType)) {
        cardType = 'master';
      }

      if (/solo/i.test(cardType)) {
        cardType = 'solo';
      }

      form = `store_credit_id=&from_mobile=1&cookie-sub=${cookieSub}&same_as_billing_address=1&order%5Bbilling_name%5D=${fullName}&order%5Bemail%5D=${encodeURIComponent(
        payment.email,
      )}&order%5Btel%5D=${phoneFormatter.format(
        billing.phone,
        'NNN-NNN-NNNN',
      )}&order%5Bbilling_address%5D=${billing.address.replace(
        /\s/g,
        '+',
      )}&order%5Bbilling_address_2%5D=${
        billing.apt ? billing.apt.replace(/\s/g, '+') : ''
      }&order%5Bbilling_address_3%5D=&order%5Bbilling_city%5D=${billing.city.replace(
        /\s/g,
        '+',
      )}&atok=sckrsarur&order%5Bbilling_zip%5D=${billing.zipCode.replace(
        /\s/g,
        '+',
      )}&order%5Bbilling_country%5D=${country}&store_address=1&credit_card%5Btype%5D=${cardType}&credit_card%5Bcnb%5D=${card}&credit_card%5Bmonth%5D=${month}&credit_card%5Byear%5D=${year}&credit_card%5Bovv%5D=${
        payment.cvv
      }&order%5Bterms%5D=0&order%5Bterms%5D=1`;
      break;
    }
    case 'JP': {
      break;
    }
    default:
      break;
  }
  return form;
};

module.exports = {
  ATC,
  parseForm,
  backupForm,
};
