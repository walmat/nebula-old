import regexes from '../validation';
import { PAYMENT_FIELDS } from '../../state/actions';

function validateEmail(email) {
  return email && regexes.email.test(email);
}

function validateCardNumber(cardNumber) {
  return cardNumber && regexes.creditCardNumber.test(cardNumber);
}

function validateExp(exp) {
// TODO: create regex for this
  return exp && regexes.creditCardExp.test(exp);
}

function validateCVV(cvv) {
  return cvv && regexes.creditCardCvv.test(cvv);
}

const paymentAttributeValidators = {
  [PAYMENT_FIELDS.EMAIL]: validateEmail,
  [PAYMENT_FIELDS.CARD_NUMBER]: validateCardNumber,
  [PAYMENT_FIELDS.EXP]: validateExp,
  [PAYMENT_FIELDS.CVV]: validateCVV,
};

export default paymentAttributeValidators;
