const phoneFormatter = require('phone-formatter');

function buildShippingForm(task, authenticity_token, captchaResponse) {
    return {
        utf8: '%E2%9C%93',
        _method: 'patch',
        authenticity_token: authenticity_token,
        'checkout%5Bbuyer_accepts_marketing%5D': '0',
        'checkout%5Bbuyer_accepts_marketing%5D': '1',
        'checkout%5Bclient_details%5D%5Bbrowser_height%5D': '714',
        'checkout%5Bclient_details%5D%5Bbrowser_width%5D': '1251',
        'checkout%5Bclient_details%5D%5Bjavascript_enabled%5D': '1',
        'checkout%5Bemail%5D': task.profile.payment.email,
        'checkout%5Bshipping_address%5D%5Baddress1%5D': task.profile.shipping.address,
        'checkout%5Bshipping_address%5D%5Baddress2%5D': task.profile.shipping.apt === null ? '' : task.profile.shipping.apt,
        'checkout%5Bshipping_address%5D%5Bcity%5D': task.profile.shipping.city,
        'checkout%5Bshipping_address%5D%5Bcountry%5D': task.profile.shipping.country,
        'checkout%5Bshipping_address%5D%5Bfirst_name%5D': task.profile.shipping.firstName,
        'checkout%5Bshipping_address%5D%5Blast_name%5D': task.profile.shipping.lastName,
        'checkout%5Bshipping_address%5D%5Bphone%5D': phoneFormatter.format(
            task.profile.shipping.phone,
            '(NNN) NNN-NNNN'
        ),
        'checkout%5Bshipping_address%5D%5Bprovince%5D': task.profile.shipping.state,
        'checkout%5Bshipping_address%5D%5Bzip%5D': task.profile.shipping.zipCode,
        'g-recaptcha-response': captchaResponse,
        previous_step: 'contact_information',
        step: 'contact_information',
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
            'checkout[billing_address][address2]': task.profile.shipping.apt === null ? '' : task.profile.shipping.apt,
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
            'checkout[billing_address][address2]': task.profile.billing.apt === null ? '' : task.profile.billing.apt,
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

