import regexes from '../validation';
import { PAYMENT_FIELDS } from '../../state/Actions';

function validateEmail(email) {
  return email && regexes.email.test(email);
}

function validateCardNumber(cardNumber) {
// TODO: create regex for this
  return true;
}

function validateExp(exp) {
// TODO: create regex for this
  return true;
}

function validateCVV(cvv) {
  return cvv && regexes.cvv.test(cvv);
}

const paymentAttributeValidators = {
  [PAYMENT_FIELDS.EMAIL]: validateEmail,
  [PAYMENT_FIELDS.CARD_NUMBER]: validateCardNumber,
  [PAYMENT_FIELDS.EXP]: validateExp,
  [PAYMENT_FIELDS.CVV]: validateCVV,
};

export default paymentAttributeValidators;
