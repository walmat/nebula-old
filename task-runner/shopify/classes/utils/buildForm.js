function buildForm(task, isCheckoutPage, authToken, type, currentStep, previousStep, shippingMethod, paymentGateway, price, sessionValue) {

    switch (type) {
        case 'payment': {
            // not really formData, but we'll include this here as well
            return {
                credit_card: {
                    number: task.profile.payment.cardNumber,
                    verification_value: task.profile.payment.cvv,
                    name: `${task.profile.billing.firstName} ${task.profile.billing.lastName}`,
                    month: parseInt(task.profile.payment.exp.slice(0,2)),
                    year: parseInt(task.profile.payment.exp.slice(3,5)),
                }
            }
        }
        case 'shippingInput': {
            if (isCheckoutPage) {
                return {
                    utf8: '✓',
                    _method: 'patch',
                    authenticity_token: authToken,
                    previous_step: previousStep,
                    step: currentStep,
                    'checkout[email]': task.profile.payment.email,
                    'checkout[buyer_accepts_marketing]': '1',
                    'checkout[shipping_address][first_name]': task.profile.shipping.firstName,
                    'checkout[shipping_address][last_name]': task.profile.shipping.lastName,
                    'checkout[shipping_address][company]': '',
                    'checkout[shipping_address][address1]': task.profile.shipping.address,
                    'checkout[shipping_address][address2]': task.profile.shipping.apt,
                    'checkout[shipping_address][city]': task.profile.shipping.city,
                    'checkout[shipping_address][country]': task.profile.shipping.country,
                    'checkout[shipping_address][province]': task.profile.shipping.state,
                    'checkout[shipping_address][zip]': task.profile.shipping.zipCode,
                    'checkout[shipping_address][phone]': task.profile.shipping.phone,
                    'checkout[remember_me]': '0',
                    button: '',
                    'checkout[client_details][browser_width]': '979',
                    'checkout[client_details][browser_height]': '631',
                };
            } else {
                return {
                    utf8: '✓',
                    _method: 'patch',
                    authenticity_token: authToken,
                    previous_step: previousStep,
                    'checkout[email]': task.profile.payment.email,
                    'checkout[shipping_address][first_name]': task.profile.shipping.firstName,
                    'checkout[shipping_address][last_name]': task.profile.shipping.lastName,
                    'checkout[shipping_address][company]': '',
                    'checkout[shipping_address][address1]': task.profile.shipping.address,
                    'checkout[shipping_address][address2]': task.profile.shipping.apt,
                    'checkout[shipping_address][city]': task.profile.shipping.city,
                    'checkout[shipping_address][country]': task.profile.shipping.country,
                    'checkout[shipping_address][province]': task.profile.shipping.state,
                    'checkout[shipping_address][zip]': task.profile.shipping.zipCode,
                    'checkout[shipping_address][phone]': task.profile.shipping.phone,
                    'checkout[remember_me]': '0',
                    'checkout[client_details][browser_width]': '979',
                    'checkout[client_details][browser_height]': '631',
                    'checkout[client_details][javascript_enabled]': '1',
                    step: currentStep,
                };
            }
        }
        case 'shippingRequest': {
            if (isCheckoutPage) {
                return {
                    utf8: '✓',
                    _method: 'patch',
                    authenticity_token: authToken,
                    button: '',
                    'checkout[email]': task.profile.payment.email,
                    'checkout[shipping_address][address1]': task.profile.shipping.address,
                    'checkout[shipping_address][address2]': task.profile.shipping.apt,
                    'checkout[shipping_address][city]': task.profile.shipping.city,
                    'checkout[shipping_address][country]': task.profile.shipping.country,
                    'checkout[shipping_address][first_name]': task.profile.shipping.firstName,
                    'checkout[shipping_address][last_name]': task.profile.shipping.lastName,
                    'checkout[shipping_address][phone]': phoneFormatter.format(
                        task.profile.shipping.phone,
                        '(NNN) NNN-NNNN'
                    ),
                    'checkout[shipping_address][province]': this._task.profile.shipping.state,
                    'checkout[shipping_address][zip]': this._task.profile.shipping.zipCode,
                    'checkout[remember_me]': '0',
                    'checkout[client_details][browser_width]': '979',
                    'checkout[client_details][browser_height]': '631',
                    'checkout[client_details][javascript_enabled]': '1',
                    previous_step: previousStep,
                    step: currentStep,
                };
            } else {
                return {
                    utf8: '✓',
                    _method: 'patch',
                    authenticity_token: authToken,
                    button: '',
                    'checkout[email]': task.profile.payment.email,
                    'checkout[shipping_address][first_name]': task.profile.shipping.firstName,
                    'checkout[shipping_address][last_name]': task.profile.shipping.lastName,
                    'checkout[shipping_address][company]': '',
                    'checkout[shipping_address][address1]': task.profile.shipping.address,
                    'checkout[shipping_address][address2]': task.profile.shipping.apt,
                    'checkout[shipping_address][city]': task.profile.shipping.city,
                    'checkout[shipping_address][country]': task.profile.shipping.country,
                    'checkout[shipping_address][province]': task.profile.shipping.state,
                    'checkout[shipping_address][zip]': task.profile.shipping.zipCode,
                    'checkout[shipping_address][phone]': phoneFormatter.format(
                        task.profile.shipping.phone,
                        '(NNN) NNN-NNNN'
                    ),
                    'checkout[remember_me]': '0',
                    'checkout[client_details][browser_width]': '979',
                    'checkout[client_details][browser_height]': '631',
                    'checkout[client_details][javascript_enabled]': '1',
                    previous_step: previousStep,
                    step: currentStep,
                };
            }
        }
        case 'submitShipping': {
            return {
                utf8: '✓',
                _method: 'patch',
                authenticity_token: authToken,
                button: '',
                previous_step: previousStep,
                step: currentStep,
                'checkout[shipping_rate][id]': shippingMethod,
            };
        }
        case 'submitBilling': {
            if (task.profile.billingMatchesShipping) {
                return {
                    utf8: '✓',
                    _method: 'patch',
                    authenticity_token: authToken,
                    previous_step: previousStep,
                    step: '',
                    s: sessionValue,
                    'checkout[payment_gateway]': paymentGateway,
                    'checkout[credit_card][vault]': 'false',
                    'checkout[different_billing_address]': true,
                    'checkout[billing_address][first_name]': task.profile.shipping.firstName,
                    'checkout[billing_address][last_name]': task.profile.shipping.lastName,
                    'checkout[billing_address][company]': '',
                    'checkout[billing_address][address1]': task.profile.shipping.address,
                    'checkout[billing_address][address2]': task.profile.shipping.apt,
                    'checkout[billing_address][city]': task.profile.shipping.city,
                    'checkout[billing_address][country]': task.profile.shipping.country,
                    'checkout[billing_address][province]': task.profile.shipping.state,
                    'checkout[billing_address][zip]': task.profile.shipping.zipCode,
                    'checkout[billing_address][phone]': phoneFormatter.format(
                        task.profile.shipping.phone,
                        '(NNN) NNN-NNNN'
                    ),
                    'checkout[total_price]': price,
                    complete: '1',
                    'checkout[client_details][browser_width]': '979',
                    'checkout[client_details][browser_height]': '631',
                    'checkout[client_details][javascript_enabled]': '1',
                };
            } else {
                return {
                    utf8: '✓',
                    _method: 'patch',
                    authenticity_token: authToken,
                    previous_step: previousStep,
                    step: '',
                    s: sValue,
                    'checkout[payment_gateway]': paymentGateway,
                    'checkout[credit_card][vault]': 'false',
                    'checkout[different_billing_address]': true,
                    'checkout[billing_address][first_name]': task.profile.billing.firstName,
                    'checkout[billing_address][last_name]': task.profile.billing.lastName,
                    'checkout[billing_address][company]': '',
                    'checkout[billing_address][address1]': task.profile.billing.address,
                    'checkout[billing_address][address2]': task.profile.billing.apt,
                    'checkout[billing_address][city]': task.profile.billing.city,
                    'checkout[billing_address][country]': task.profile.billing.country,
                    'checkout[billing_address][province]': task.profile.billing.state,
                    'checkout[billing_address][zip]': task.profile.billing.zipCode,
                    'checkout[billing_address][phone]': phoneFormatter.format(
                        task.profile.billing.phone,
                        '(NNN) NNN-NNNN'
                    ),
                    'checkout[total_price]': price,
                    complete: '1',
                    'checkout[client_details][browser_width]': '979',
                    'checkout[client_details][browser_height]': '631',
                    'checkout[client_details][javascript_enabled]': '1',
                }
            }
        }
        case 'addToCartData': {
            switch (task.site.name) {
                case 'DSM US': {
                    return {
                        qty: 1,
                        name: 'add',
                        id: task.product.variant,
                        'properties[_HASH]': 256779527127,
                    }
                }
                case 'DSM EU': {
                    return {
                        qty: 1,
                        id: task.product.variant,
                        'properties[_hash]': '', // find this...
                    }
                }
                default: {
                    return {
                        qty: 1,
                        id: task.product.variant,
                    }
                }
            }
        }
        case 'getCheckoutData': {
            switch(task.site.name) {
                default: {
                    return {
                        quantity: 1,
                        'checkout': 'Checkout',
                    }
                }
            }
        }
        default: {
            break;
        }
    }
}

module.exports = buildForm;