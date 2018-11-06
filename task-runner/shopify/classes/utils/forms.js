const phoneFormatter = require('phone-formatter');

function buildShippingForm(task, authenticity_token, captchaResponse, step, previousStep) {
    return {
        "utf8": "✓",
        "_method": "patch",
        "authenticity_token": authenticity_token,
        "previous_step": previousStep,
        "checkout[email]": task.profile.payment.email,
        "checkout[buyer_accepts_marketing]": 0,
        "checkout[shipping_address][first_name]": task.profile.shipping.firstName,
        "checkout[shipping_address][last_name]": task.profile.shipping.lastName,
        "checkout[shipping_address][address1]": task.profile.shipping.address,
        "checkout[shipping_address][address2]": task.profile.shipping.apt,
        "checkout[shipping_address][city]": task.profile.shipping.city,
        "checkout[shipping_address][country]": task.profile.shipping.country,
        "checkout[shipping_address][province]": task.profile.shipping.state,
        "checkout[shipping_address][zip]": task.profile.shipping.zipCode,
        "checkout[shipping_address][phone]": phoneFormatter.format(
            task.profile.shipping.phone,
            '(NNN) NNN-NNNN'
        ),
        "step": step,
        "g-captcha-response": captchaResponse,
        'checkout[client_details][browser_width]': '979',
        'checkout[client_details][browser_height]': '631',
        'checkout[remember_me]': '0',
        "button": ''
    }
}
module.exports.buildShippingForm = buildShippingForm;

function buildShippingMethodForm(task, authenticity_token, captchaResponse) {
    return {
        utf8: '✓',
        _method: 'patch',
        authenticity_token: authenticity_token,
        button: '',
        'checkout[email]': task.profile.payment.email,
        'checkout[shipping_address][first_name]': task.profile.shipping.firstName,
        'checkout[shipping_address][last_name]': task.profile.shipping.lastName,
        'checkout[shipping_address][company]': '',
        'checkout[shipping_address][address1]': task.profile.shipping.address,
        'checkout[shipping_address][address2]': '',
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
        'g-recaptcha-response': captchaResponse,
        previous_step: 'contact_information',
        step: 'shipping_method',
        'secret': 'true',
    }
}
module.exports.buildShippingMethodForm = buildShippingMethodForm;

function buildPaymentForm(task, authenticity_token, previousStep, price, paymentGateway, shippingValue, captchaResponse) {

    if (task.profile.billingMatchesShipping) {
        return {
            utf8: '✓',
            _method: 'patch',
            authenticity_token: authenticity_token,
            previous_step: previousStep,
            step: 'payment_method',
            s: shippingValue,
            'checkout[payment_gateway]': paymentGateway,
            'checkout[credit_card][vault]': 'false',
            'checkout[different_billing_address]': 'false',
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
            button: '',
            'g-recaptcha-response': captchaResponse,
            'secret': 'true',
        };
    } else {
        return {
            utf8: '✓',
            _method: 'patch',
            authenticity_token: authenticity_token,
            previous_step: previousStep,
            step: '',
            s: shippingValue,
            'checkout[payment_gateway]': paymentGateway,
            'checkout[credit_card][vault]': 'false',
            'checkout[different_billing_address]': 'true',
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
            button: '',
            'g-recaptcha-response': captchaResponse,
            'secret': 'true',
        }
    }
}
module.exports.buildPaymentForm = buildPaymentForm;

function buildCartForm(task, variant) {
    switch(task.site.name) {
        case 'DSM US': {
            return {
                qty: 1,
                name: 'add',
                id: variant,
                'properties[_HASH]': 256779527127,
            }
        }
        case 'DSM EU': {
            return {
                qty: 1,
                id: variant,
                'properties[_hash]': '', // find this...
            }
        }
        case 'DSM SG': {
            return {
                id: variant,
                'add': '',
            }
        }
        default: {
            return {
                qty: 1,
                id: variant,
            }
        }
    }
}
module.exports.buildCartForm = buildCartForm;

