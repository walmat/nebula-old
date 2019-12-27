import validator from 'card-validator';
import phoneFormatter from 'phone-formatter';

import { Regions } from '../constants';

export const Forms = {
  Cart: 'cart',
  Checkout: 'checkout',
};

export const cart = (size, style, region) => {
  switch (region) {
    case Regions.EU:
      return `size=${size}&style=${style}&qty=1`;
    default:
      return `s=${size}&st=${style}&ds=bog&qty=1`;
  }
};

export const parseForm = async (form, type, product, task) => {
  let data = [];
  switch (type) {
    case Forms.Cart: {
      const {
        id: style,
        variant: { id: size },
      } = product;

      data = await form.map(({ name, friendly, value }) => {
        if (/size/.test(friendly)) {
          return `${encodeURI(name)}=${size}&`;
        }

        if (/style/.test(friendly)) {
          return `${encodeURI(name)}=${style}&`;
        }

        if (/add/i.test(friendly)) {
          return `${encodeURI(name)}=${Number(`${style}`) + Number(`${size}`)}&`
        }

        return `${encodeURI(name)}=${value}&`;
      });
      break;
    }

    case Forms.Checkout: {
      const {
        profile: { billing, payment },
      } = task;

      const {
        variant: { id: size },
      } = product;

      const { firstName, lastName, address, apt, city, country, province, zip, phone } = billing;
      const { card, email, exp, cvv } = payment;

      let countryValue;
      switch (country.value) {
        case 'US': {
          countryValue = 'USA';
          break;
        }
        case 'CA': {
          countryValue = 'CANADA';
          break;
        }
        default: {
          countryValue = billing.country.value;
          break;
        }
      }

      let month = payment.exp.slice(0, 2);
      if (month.length !== 2) {
        month = `0${month}`;
      }

      data = await form.map(({ name, friendly, value }) => {
        if (friendly) {
          if (/name/i.test(friendly)) {
            return `${encodeURI(name)}=${firstName} ${lastName}&`;
          }

          if (/email/i.test(friendly)) {
            return `${encodeURI(name)}=${encodeURIComponent(email)}&`;
          }

          if (/phone/i.test(friendly)) {
            return `${encodeURI(name)}=${phoneFormatter.format(phone, 'NNN-NNN-NNNN')}&`;
          }

          if (/address/i.test(friendly)) {
            return `${encodeURI(name)}=${address}&`;
          }

          if (/apt/i.test(friendly)) {
            return `${encodeURI(name)}=${apt || ''}&`;
          }

          if (/zip/i.test(friendly)) {
            return `${encodeURI(name)}=${zip}&`;
          }

          if (/city/i.test(friendly)) {
            return `${encodeURI(name)}=${city}&`;
          }

          if (/province/i.test(friendly)) {
            return `${encodeURI(name)}=${province ? province.value : ''}&`;
          }

          if (/country/i.test(friendly)) {
            return `${encodeURI(name)}=${countryValue}&`;
          }

          if (/card/i.test(friendly)) {
            return `${encodeURI(name)}=${card.match(/.{1,4}/g).join('+')}&`;
          }

          if (/month/i.test(friendly)) {
            return `${encodeURI(name)}=${month}&`;
          }

          if (/year/i.test(friendly)) {
            return `${encodeURI(name)}=${`20${exp.slice(3, 5)}`}&`;
          }

          if (/cvv/i.test(friendly)) {
            return `${encodeURI(name)}=${cvv}&`;
          }
        }

        if (/cookie-sub/i.test(name)) {
          // eslint-disable-next-line prettier/prettier
          return `${encodeURI(name)}=${encodeURIComponent(encodeURIComponent(JSON.stringify({[size]:1})))}&`;
        }

        return `${encodeURI(name)}=${value}&`;
      });
      break;
    }

    default:
      break;
  }

  data = data.join('').replace(/\s/g, '+');
  if (data.endsWith('&')) {
    data = data.slice(0, -1);
  }

  return data;
};

export const backupForm = (region, billing, payment, size) => {
  let form = '';
  const fullName = `${billing.firstName.replace(/\s/g, '+')}+${billing.lastName.replace(
    /\s/g,
    '+',
  )}`;

  const card = payment.card.match(/.{1,4}/g).join('+');
  const month =
    payment.exp.slice(0, 2).length < 2 ? `0${payment.exp.slice(0, 2)}` : payment.exp.slice(0, 2);
  const year = `20${payment.exp.slice(3, 5)}`;
  // NOTE: we can't include the spaces here!!
  // eslint-disable-next-line prettier/prettier
  const cookieSub = encodeURIComponent(JSON.stringify({[size]:1}));

  let country;

  switch (billing.country.value) {
    case 'US': {
      country = 'USA';
      break;
    }
    case 'CA': {
      country = 'CANADA';
      break;
    }
    default: {
      country = billing.country.value;
      break;
    }
  }

  switch (region) {
    case Regions.US: {
      form = `store_credit_id=&from_mobile=1&cookie-sub=${encodeURIComponent(
        cookieSub,
      )}&same_as_billing_address=1&scerkhaj=CKCRSUJHXH&order%5Bbilling_name%5D=&order%5Bbn%5D=${fullName}&order%5Bemail%5D=${encodeURIComponent(
        payment.email,
      )}&order%5Btel%5D=${phoneFormatter.format(
        billing.phone,
        'NNN-NNN-NNNN',
      )}&order%5Bbilling_address%5D=${billing.address.replace(
        /\s/g,
        '+',
      )}&order%5Bbilling_address_2%5D=${
        billing.apt ? billing.apt.replace(/\s/g, '+') : ''
      }&order%5Bbilling_zip%5D=${billing.zip.replace(
        /\s/g,
        '+',
      )}&order%5Bbilling_city%5D=${billing.city.replace(/\s/g, '+')}&order%5Bbilling_state%5D=${
        billing.province ? billing.province.value.replace(/\s/g, '+') : ''
      }&order%5Bbilling_country%5D=${country}&riearmxa=${card}&credit_card%5Bmonth%5D=${month}&credit_card%5Byear%5D=${year}&rand=&credit_card%5Bmeknk%5D=${
        payment.cvv
      }&order%5Bterms%5D=0&order%5Bterms%5D=1`;
      break;
    }
    case Regions.EU: {
      const validNumber = validator.number(payment.card);
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

      form = `store_credit_id=&from_mobile=1&cookie-sub=${encodeURIComponent(
        cookieSub,
      )}&same_as_billing_address=1&order%5Bbilling_name%5D=${fullName}&order%5Bemail%5D=${encodeURIComponent(
        payment.email,
      )}&order%5Btel%5D=${encodeURIComponent(
        phoneFormatter.format(billing.phone, 'NNNNNNNNNN'),
      )}&order%5Bbilling_address%5D=${billing.address.replace(
        /\s/g,
        '+',
      )}&order%5Bbilling_address_2%5D=${
        billing.apt ? billing.apt.replace(/\s/g, '+') : ''
      }&order%5Bbilling_address_3%5D=&order%5Bbilling_city%5D=${billing.city.replace(
        /\s/g,
        '+',
      )}&atok=sckrsarur&order%5Bbilling_zip%5D=${billing.zip.replace(
        /\s/g,
        '+',
      )}&order%5Bbilling_country%5D=${country}&credit_card%5Btype%5D=${cardType}&credit_card%5Bcnb%5D=${card}&credit_card%5Bmonth%5D=${month}&credit_card%5Byear%5D=${year}&credit_card%5Bovv%5D=${
        payment.cvv
      }&order%5Bterms%5D=0&order%5Bterms%5D=1`;
      break;
    }
    case Regions.JP: {
      break;
    }
    default:
      break;
  }
  return form;
};
