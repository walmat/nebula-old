import { Utils } from '../../common';
import pickVariant from './pickVariant';
import {
  getAllSpecialStores,
  getAllSupportedStores,
  getAllSupportedStoresSorted,
  isSpecialStore,
} from './storeOptions';
import {
  clothingRegexMap,
  urlToOptionIndex,
  urlToTitleSegment,
  urlToVariantOption,
  validateVariantSize,
} from './urlVariantMaps';
import { addToCart, parseForm, patchCheckoutForm, patchToCart } from './forms';
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

export const stateForError = ({ status, name, errno }, { message, nextState }) => {
  // Look for errors in cause
  const match = /(ECONNRESET|ETIMEDOUT|ESOCKETTIMEDOUT|ENOTFOUND|ECONNREFUSED)/.exec(errno);

  if (/aborterror/i.test(name)) {
    return { nextState: States.ABORT };
  }

  if (match) {
    // Check capturing group
    switch (match[1]) {
      // connection reset
      case 'ENOTFOUND':
      case 'ECONNRESET': {
        return {
          message: 'Swapping proxy',
          nextState: States.SWAP,
        };
      }
      // request timeout or socket freeze timeout
      case 'ETIMEDOUT':
      case 'ECONNREFUSED':
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
        message: `Swapping proxy - (${status})`,
        nextState: States.SWAP,
      };
    }
    case 303: {
      return {
        message: 'Polling queue - (303)',
        nextState: States.QUEUE,
      };
    }
    default: {
      return status >= 500
        ? {
            message: `${message} - (${status})`,
            nextState,
          }
        : null;
    }
  }
};

export const getHeaders = ({ url, apiKey }) => ({
  'X-Shopify-Checkout-Version': '2019-10-06',
  'X-Shopify-Access-Token': apiKey,
  'x-barba': 'yes',
  connection: 'keep-alive',
  'User-Agent': userAgent,
  host: `${url.split('/')[2]}`,
  authorization: `Basic ${Buffer.from(`${apiKey}::`).toString('base64')}`,
});

const StoreOptions = {
  getAllSpecialStores,
  getAllSupportedStores,
  getAllSupportedStoresSorted,
  isSpecialStore,
};

const UrlVariantMaps = {
  clothingRegexMap,
  urlToOptionIndex,
  urlToTitleSegment,
  urlToVariantOption,
  validateVariantSize,
};

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
};

export { pickVariant, Parse, StoreOptions, UrlVariantMaps, Forms };
