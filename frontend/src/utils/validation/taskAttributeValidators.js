import regexes from '../validation';
import { TASK_FIELDS } from '../../state/actions';

function validateProduct(productRawInput) {
  const kws = productRawInput.split(',').reduce((a, x) => a.concat(x.trim().split(' ')), []);
  const validKeywords = kws.map(val => regexes.keywordRegex.test(val));

  if (regexes.urlRegex.test(productRawInput)) {
    return true;
  } else if (regexes.variantRegex.test(productRawInput)) {
    return true;
  } else if (validKeywords) {
    return true;
  }
  return false;
}

/**
 * Used to validate all single select inputs
 * @param {Object} select - Object (non-null);
 */
function validateSingleSelect(select) {
  return select && select.length === 1;
}

function validateRequiredInput(input) {
  return input && input !== '';
}

/**
 * Used to validate the sizes input
 * @param {Object} select - Array of objects - can be one
 */
function validateMultiSelect(select) {
  return select && select.length > 0;
}

const taskAttributeValidators = {
  [TASK_FIELDS.EDIT_PRODUCT]: validateProduct,
  [TASK_FIELDS.EDIT_SITE]: validateSingleSelect,
  [TASK_FIELDS.EDIT_PROFILE]: validateSingleSelect,
  [TASK_FIELDS.EDIT_SIZES]: validateMultiSelect,
  [TASK_FIELDS.EDIT_USERNAME]: validateRequiredInput,
  [TASK_FIELDS.EDIT_SIZES]: validateRequiredInput,
};

export default taskAttributeValidators;
