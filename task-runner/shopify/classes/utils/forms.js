const phoneFormatter = require('phone-formatter');

function buildPaymentTokenForm(task) {
    return {
        'credit_card': {
            'number': task.profile.payment.cardNumber,
            'verification_value': task.profile.payment.cvv,
            'name': `${task.profile.billing.firstName} ${task.profile.billing.lastName}`,
            'month': parseInt(task.profile.payment.exp.slice(0,2)),
            'year': parseInt(task.profile.payment.exp.slice(3,5)),
        }
    }
}
module.exports.buildPaymentTokenForm = buildPaymentTokenForm;

function buildCheckoutForm(task) {

    let form = {
        "card_source": "vault",
        "pollingOptions": {
            "poll": false
        },
        "checkout": {
            "wallet_name": "default",
            "secret": true,
            "is_upstream_button": true,
            "email": task.profile.payment.email,
            "shipping_address": {
                "first_name": task.profile.shipping.firstName,
                "last_name": task.profile.shipping.lastName,
                "address1": task.profile.shipping.address,
                "address2": task.profile.shipping.apt,
                "company": null,
                "city": task.profile.shipping.city,
                "country_code": task.profile.shipping.country.value,
                "province_code": task.profile.shipping.state.value,
                "phone": phoneFormatter.format(
                    task.profile.shipping.phone,
                    '(NNN) NNN-NNNN'
                ),
                "zip": task.profile.shipping.zipCode
            },
            "billing_address": {
                "first_name": task.profile.billing.firstName,
                "last_name": task.profile.billing.lastName,
                "address1": task.profile.billing.address,
                "address2": task.profile.billing.apt,
                "company": null,
                "city": task.profile.billing.city,
                "country_code": task.profile.billing.country.value,
                "province_code": task.profile.billing.state.value,
                "phone": phoneFormatter.format(
                    task.profile.billing.phone,
                    '(NNN) NNN-NNNN'
                ),
                "zip": task.profile.billing.zipCode
            }
        },
    }
    console.log(JSON.stringify(form));
    return form;
}
module.exports.buildCheckoutForm = buildCheckoutForm;

function buildPaymentForm(paymentToken, shippingMethod, captchaToken) {
    return {
        utf8: '✓',
        _method: 'patch',
        authenticity_token: '',
        previous_step: 'payment_method',
        step: '',
        s: paymentToken,
        'checkout[remember_me]': 0,
        'checkout[total_price]': '',
        'complete': 1,
        'checkout[client_details][browser_width]': '979',
        'checkout[client_details][browser_height]': '631',
        'checkout[client_details][javascript_enabled]': '1',
        'checkout[shipping_rate][id]': shippingMethod,
        button: '',
        "g-captcha-response": captchaToken,
    };
}
module.exports.buildPaymentForm = buildPaymentForm;

// TODO - frontend payment submission for dsm
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

function buildPatchCartForm(opts) {
  // might need hash included in the properties for DSM checkout
  let form = {
    "checkout":{
      "line_items":[{
        "variant_id":`"${opts.variant}"`,
        "quantity":"1",
        "properties":{}
      }]
    }
  }

  console.log(form);
  return form;
}
module.exports.buildPatchCartForm = buildPatchCartForm;
