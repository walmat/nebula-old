import { every } from 'underscore';
import { parseURL } from 'whatwg-url';
import regexes from '../validation';
import { TASK_FIELDS } from '../../state/actions';

function validateProduct(product, isFormValidator) {
  if (!isFormValidator && product === '') {
    return true;
  }

  if (!product) {
    return false;
  }

  let rawProduct = product;
  if (typeof product === 'object') {
    rawProduct = product.raw;
  }

  // TEMPORARY! - for testing with the mock server:
  // const localhostUrlRegex = /https?:\/\/localhost:\d{2,5}/;
  // if (localhostUrlRegex.test(rawProduct)) {
  //   return true;
  // }
  // END TEMPORARY

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

function validateSite(site, isFormValidator) {
  if (!isFormValidator && site === '') {
    return true;
  }

  if (!site || !site.url) {
    return false;
  }
  const URL = parseURL(site.url);
  return URL && URL.host;
}

function validateProfile(profile) {
  return profile && profile.id;
}

function validateNonEmpty(input, isFormValidator) {
  if (!isFormValidator && input === '') {
    return true;
  }
  return input;
}

const taskAttributeValidators = {
  [TASK_FIELDS.EDIT_PRODUCT]: validateProduct,
  [TASK_FIELDS.EDIT_SITE]: validateSite,
  [TASK_FIELDS.EDIT_PROFILE]: validateProfile,
  [TASK_FIELDS.EDIT_SIZES]: validateNonEmpty,
  [TASK_FIELDS.EDIT_TASK_CATEGORY]: validateNonEmpty,
  [TASK_FIELDS.EDIT_PRODUCT_VARIATION]: validateNonEmpty,
  [TASK_FIELDS.EDIT_TASK_TYPE]: () => true,
  [TASK_FIELDS.EDIT_TASK_ACCOUNT]: () => true,
  [TASK_FIELDS.EDIT_AMOUNT]: input => parseInt(input, 10) > 0,
};

export default taskAttributeValidators;
