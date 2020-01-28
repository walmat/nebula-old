import { Utils } from '../../common';
import pickVariant from './pickVariant';
import {
  addToCart,
  parseForm,
  patchCheckoutForm,
  patchToCart,
  contactForm,
  shippingForm,
  paymentForm,
  completeForm,
} from './forms';
import {
  convertToJson,
  filterAndLimit,
  getParseType,
  matchKeywords,
  matchVariant,
  match,
  getFullProductInfo,
} from './parse';
import { Task as TaskConstants } from '../constants';

const { States } = TaskConstants;
const { userAgent } = Utils;

export const stateForError = ({ status, type, name, errno }, { message, nextState }) => {
  // Look for errors in cause
  const errorMatch = /(ECONNRESET|ETIMEDOUT|ESOCKETTIMEDOUT|ENOTFOUND|ECONNREFUSED)/.exec(errno);

  if (/timeout/i.test(type)) {
    return { nextState, message };
  }

  if (/aborterror/i.test(name)) {
    return { nextState: States.ABORT };
  }

  if (errorMatch) {
    // Check capturing group
    switch (errorMatch[1]) {
      // connection reset
      case 'ENOTFOUND':
      case 'ECONNREFUSED':
      case 'ECONNRESET': {
        return {
          message: 'Connection issues',
          nextState,
        };
      }
      // request timeout or socket freeze timeout
      case 'ETIMEDOUT':
      case 'ESOCKETTIMEDOUT': {
        return { message, nextState };
      }
      default: {
        break;
      }
    }
  }

  switch (status) {
    case 429:
    case 430: {
      return {
        message: `Connection issues`,
        nextState,
      };
    }
    case 303: {
      return {
        message: 'Polling queue',
        nextState: States.QUEUE,
      };
    }
    default: {
      return status >= 500
        ? {
            message: `${message} (${status})`,
            nextState,
          }
        : null;
    }
  }
};

export const getHeaders = ({ url, apiKey }) => ({
  'X-Shopify-Storefront-Access-Token': apiKey,
  'X-Shopify-Checkout-Version': '2018-03-05',
  'X-Shopify-Access-Token': apiKey,
  connection: 'keep-alive',
  'user-agent': userAgent,
  origin: url,
  host: `${url.split('/')[2]}`,
  authorization: `Basic ${Buffer.from(`${apiKey}::`).toString('base64')}`,
});

const Parse = {
  convertToJson,
  filterAndLimit,
  getParseType,
  matchKeywords,
  matchVariant,
  match,
  getFullProductInfo,
};

const Forms = {
  addToCart,
  parseForm,
  patchCheckoutForm,
  patchToCart,
  contactForm,
  shippingForm,
  paymentForm,
  completeForm,
};

export { pickVariant, Parse, Forms };
