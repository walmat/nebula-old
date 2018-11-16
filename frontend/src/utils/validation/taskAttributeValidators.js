import _ from 'underscore';
import regexes from '../validation';
import { TASK_FIELDS } from '../../state/actions';
import getAllSupportedSitesSorted from '../../constants/getAllSites';

function validateProduct(product) {
  if (!product) {
    return false;
  }

  if (typeof (product) === 'object') {
    product = product.raw;
  }

  const kws = product.split(',').reduce((a, x) => a.concat(x.trim().split(' ')), []);
  const testKeywords = kws.map(val => regexes.keywordRegex.test(val));
  const validKeywords = _.every(testKeywords, isValid => isValid === true);

  if (regexes.urlRegex.test(product)) {
    return true;
  } else if (regexes.variantRegex.test(product)) {
    return true;
  } else if (validKeywords) {
    return true;
  }
  return false; // default to not valid
}

function validateSite(site) {
  const sites = getAllSupportedSitesSorted();
  return site && site.name && sites.some(s => s.label === site.name);
}

/**
 * We can assume only valid sizes can be added..
 * @param {Array} sizes - array of sizes
 */
function validateSizes(sizes) {
  // console.log(sizes);
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
  console.log(input && input !== '');
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
