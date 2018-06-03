import regexes from '../validation';

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
  email: validateEmail,
  cardNumber: validateCardNumber,
  exp: validateExp,
  cvv: validateCVV,
};

export default paymentAttributeValidators;
