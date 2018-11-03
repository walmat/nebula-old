const phoneFormatter = require('phone-formatter');

function buildShippingForm(task, authenticity_token, captchaResponse) {
    return {
        "utf8": "\u2713",
        "_method": "patch",
        "authenticity_token": authenticity_token,
        "previous_step": "contact_information",
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
        "step": "contact_information",
        "g-captcha-response": captchaResponse,
        "button": ''
    }
}
module.exports.buildShippingForm = buildShippingForm;

function buildPaymentForm(task, authenticity_token, prev_step, paymentGateway, price, shippingValue, captchaResponse) {

    if (task.profile.billingMatchesShipping) {
        return {
            utf8: '✓',
            _method: 'patch',
            authenticity_token: authenticity_token,
            previous_step: prev_step,
            step: '',
            s: shippingValue,
            'checkout[payment_gateway]': paymentGateway,
            'checkout[credit_card][vault]': 'false',
            'checkout[different_billing_address]': 'true',
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
        };
    } else {
        return {
            utf8: '✓',
            _method: 'patch',
            authenticity_token: authenticity_token,
            previous_step: prev_step,
            step: '',
            s: shippingValue,
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
            button: '',
            'g-recaptcha-response': captchaResponse,
        }
    }
}
module.exports.buildPaymentForm = buildPaymentForm;

function buildCartForm(task) {
    switch(task.site.name) {
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
        case 'DSM SG': {
            return {
                id: task.product.variant,
                'add': '',
            }
        }
        default: {
            return {
                quantity: 1,
                id: task.product.variant,
            }
        }
    }
}
module.exports.buildCartForm = buildCartForm;

