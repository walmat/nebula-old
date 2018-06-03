import regexes from '../validation';

const paymentAttributeValidators = {
    email: validateEmail,
    cardNumber: validateCardNumber,
    exp: validateExp,
    cvv: validateCVV
};

function validateEmail(payment) {
    return payment.email && regexes.email.test(payment.email);
}

function validateCardNumber(payment) {
    // TODO: create regex for this
    return payment.cardNumber;
}

function validateExp(payment) {
    // TODO: create regex for this
    return payment.exp;
}

function validateCVV(payment) {
    return payment.cvv && regexes.cvv.test(payment.cvv);
}

export default paymentAttributeValidators;
