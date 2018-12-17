import _ from 'underscore';
import regexes from '../validation';
import { TASK_FIELDS } from '../../state/actions';
import fetchSites from '../../constants/getAllSites';

function validateProduct(product) {
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
  const validKeywords = _.every(testKeywords, isValid => isValid === true);
  if (validKeywords) {
    return true;
  }
  return false; // default to not valid
}

async function validateSite(site) {
  const sites = await fetchSites();
  return site && site.label && sites.some(s => s.label === site.label);
}

/**
 * We can assume only valid sizes can be added..
 * @param {Array} sizes - array of sizes
 */
function validateSizes(sizes) {
  return sizes && sizes.length > 0;
}

function validateProfile(profile) {
  return profile && profile.id;
}

/**
 * Used to validate all basic inputs
 * @param {String} input - The string input (non empty);
 */
function validateAccountInformation(input) {
  return input && input !== '';
}

const taskAttributeValidators = {
  [TASK_FIELDS.EDIT_PRODUCT]: validateProduct,
  [TASK_FIELDS.EDIT_SITE]: validateSite,
  [TASK_FIELDS.EDIT_PROFILE]: validateProfile,
  [TASK_FIELDS.EDIT_SIZES]: validateSizes,
  [TASK_FIELDS.EDIT_USERNAME]: validateAccountInformation,
  [TASK_FIELDS.EDIT_PASSWORD]: validateAccountInformation,
};

export default taskAttributeValidators;
