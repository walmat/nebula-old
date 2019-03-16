import _ from 'underscore';
import { SETTINGS_FIELDS } from '../../state/actions';
import regexes from '../validation';
import getAllSupportedSitesSorted from '../../constants/getAllSites';

function validateProxies(proxies) {
  const errorMap = [];
  proxies.forEach((proxy, idx) => {
    const matchDefault = regexes.settingsProxyDefault.test(proxy);
    const matchUserPass = regexes.settingsProxyUserPass.test(proxy);
    const matchSubnet = regexes.settingsProxySubnet.test(proxy);
    const matchSubnetUserPass = regexes.settingsProxySubnetUserPass.test(proxy);
    if (!matchDefault && !matchUserPass && !matchSubnet && !matchSubnetUserPass) {
      errorMap.push(idx);
    }
  });
  return errorMap;
}

function validateProduct(product) {
  console.log(product);
  if (!product) {
    return false;
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
  const validKeywords = _.every(testKeywords, isValid => isValid === true);
  if (validKeywords) {
    return true;
  }
  return false; // default to not valid
}

function validateProfile(profile) {
  return profile && profile.id;
}
function validateSite(site) {
  const sites = getAllSupportedSitesSorted();
  return site && site.name && sites.some(s => s.label === site.name);
}

function validateInput(input) {
  return input && input !== '';
}

const settingsAttributeValidatorMap = {
  [SETTINGS_FIELDS.EDIT_PROXIES]: validateProxies,
  [SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT]: validateProduct,
  [SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME]: validateInput,
  [SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE]: validateProfile,
  [SETTINGS_FIELDS.EDIT_SHIPPING_SITE]: validateSite,
  [SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME]: validateInput,
  [SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD]: validateInput,
};

export default settingsAttributeValidatorMap;
