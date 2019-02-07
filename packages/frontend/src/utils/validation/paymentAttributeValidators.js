import valid from 'card-validator';
import regexes from '../validation';
import { PAYMENT_FIELDS } from '../../state/actions';

function validateEmail(email) {
  return email && regexes.email.test(email.toLowerCase());
}

function validateCardNumber(cardNumber) {
  return cardNumber && valid.number(cardNumber).isValid;
}

function validateExp(exp) {
  // TODO: create regex for this
  return exp && valid.expirationDate(exp).isValid;
}

function validateCVV(cvv) {
  // TODO: Validate cvv for specific cc types (e.g. - AMEX, VISA, DISCOVER, etc.)
  // return cvv && valid.cvv(cvv).isValid;
  return cvv && cvv !== '';
}

const paymentAttributeValidators = {
  [PAYMENT_FIELDS.EMAIL]: validateEmail,
  [PAYMENT_FIELDS.CARD_NUMBER]: validateCardNumber,
  [PAYMENT_FIELDS.EXP]: validateExp,
  [PAYMENT_FIELDS.CVV]: validateCVV,
};

export default paymentAttributeValidators;
