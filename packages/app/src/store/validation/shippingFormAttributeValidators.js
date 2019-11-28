import { every } from 'lodash';
import { parseURL } from 'whatwg-url';
import regexes from '../../utils/regexes';
import { SETTINGS_FIELDS } from '../actions';

function validateProduct(product) {
  if (!product) {
    return false;
  }

  if (product.startsWith('shopify-')) {
    return true;
  }

  let rawProduct = product;
  if (typeof product === 'object') {
    rawProduct = product.raw;
  }

  if (regexes.urlRegex.test(rawProduct)) {
    return true;
  }
  if (regexes.variantRegex.test(rawProduct)) {
    return true;
  }

  const kws = rawProduct.split(',').reduce((a, x) => a.concat(x.trim().split(' ')), []);
  const testKeywords = kws.map(val => regexes.keywordRegex.test(val));
  const validKeywords = every(testKeywords, isValid => isValid === true);
  if (validKeywords) {
    return true;
  }
  return false; // default to not valid
}

function validateProfile(profile) {
  return profile && profile.id;
}

function validateSite(site) {
  if (!site || !site.url) {
    return false;
  }
  const URL = parseURL(site.url);
  return URL && URL.host;
}

function validateInput(input) {
  return input && input !== '';
}

const shippingFormAttributeValidatorMap = {
  [SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT]: validateProduct,
  [SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME]: validateInput,
  [SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE]: validateProfile,
  [SETTINGS_FIELDS.EDIT_SHIPPING_SITE]: validateSite,
  [SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME]: validateInput,
  [SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD]: validateInput,
};

export default shippingFormAttributeValidatorMap;
