import { PROFILE_FIELDS } from '../actions';

import locationAttributeValidators from './locationAttributeValidators';
import paymentAttributeValidators from './paymentAttributeValidators';

function validateName(name) {
  // TODO: Check if we want to limit this to numbers and letters only...
  return name && name !== '';
}

function validateBillingMatchesShipping(billingMatchesShipping) {
  return billingMatchesShipping || billingMatchesShipping === false;
}

const profileAttributeValidatorMap = {
  [PROFILE_FIELDS.EDIT_BILLING]: locationAttributeValidators,
  [PROFILE_FIELDS.EDIT_SHIPPING]: locationAttributeValidators,
  [PROFILE_FIELDS.EDIT_PAYMENT]: paymentAttributeValidators,
  [PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING]: validateBillingMatchesShipping,
  [PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING]: validateBillingMatchesShipping,
  [PROFILE_FIELDS.EDIT_NAME]: validateName,
};

export default profileAttributeValidatorMap;
