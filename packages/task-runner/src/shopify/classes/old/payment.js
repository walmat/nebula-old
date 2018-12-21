/**
 * Parse includes
 */
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const now = require('performance-now');

/**
 * Form includes
 */
const { buildBillingForm } = require('../utils/forms');

/**
 * Utils includes
 */
const { formatProxy, userAgent } = require('../utils');

class Payment {
  constructor(
    context,
    timer,
    request,
    checkoutUrl,
    authToken,
    price,
    paymentGateway,
    paymentToken,
    shippingValue,
    captchaResponse
  ) {
    /**
     * All data needed for monitor to run
     * This includes:
     * - current runner id
     * - current task
     * - current proxy
     * - whether or not we should abort
     * @type {TaskRunnerContext}
     */
    this._context = context;
    this._timer = timer;
    this._request = request;
    this._checkoutUrl = checkoutUrl;
    this._authToken = authToken;
    this._price = price;
    this._paymentGateway = paymentGateway;
    this._paymentToken = paymentToken;
    this._shippingValue = shippingValue;
    this._captchaResponse = captchaResponse;

    this._task = this._context.task;
    this._proxy = this._context.proxy;
    this._aborted = this._context.aborted;
    this._logger = this._context.logger;

    /**
     * STATES THAT THE PAYMENT MODULE CAN BE IN
     */
    this.PAYMENT_STATES = {
      Processing: 'PROCESSING',
      Error: 'PAYMENT_ERROR',
      Declined: 'DECLINED',
      Success: 'SUCCESS',
    };
  }

  submit() {
    this._timer.start(now());
    this._logger.info('Starting Payment Submit Request...');
    return this._request({
      uri: `${this._checkoutUrl}?step=payment_method`,
      proxy: formatProxy(this._proxy),
      method: 'get',
      followAllRedirects: true,
      simple: false,
      json: false,
      resolveWithFullResponse: true,
      headers: {
        'User-Agent': userAgent,
      },
      transform(body) {
        return cheerio.load(body);
      },
    })
      .then($ => {
        const gateway = $('input[name="checkout[payment_gateway]"]').attr(
          'value'
        );
        const authToken = $(
          'form[data-payment-form=""] input[name="authenticity_token"]'
        ).attr('value');

        return this._request({
          uri: `${this._checkoutUrl}`,
          method: 'post',
          proxy: formatProxy(this._proxy),
          followAllRedirects: true,
          resolveWithFullResponse: true,
          simple: false,
          json: false,
          headers: {
            'User-Agent': userAgent,
            'Content-Type': 'application/json',
          },
          formData: buildBillingForm(
            this._task,
            authToken,
            'payment_method',
            this._price,
            gateway,
            this._paymentToken,
            this._shippingValue,
            this._captchaResponse
          ),
        });
      })
      .then(res => {
        const $ = cheerio.load(res.body);
        // TODO: Only do this when debugging!
        const debugHtmlPath = path.join(__dirname, 'debug.html');
        this._logger.debug('Writing out debug html to: %s', debugHtmlPath);
        fs.writeFileSync(debugHtmlPath, res.body);
        this._timer.stop(now());
        this._logger.info(
          'Submitted Payment in %d ms',
          this._timer.getRunTime()
        );

        if ($('input[name="step"]').val() === 'processing') {
          this._logger.info(
            'Payment is processing, go check your email for a confirmation.'
          );
          return this.PAYMENT_STATES.Processing;
        }
        if (
          $('title')
            .text()
            .indexOf('Processing') > -1
        ) {
          this._logger.info(
            'Payment is processing, go check your email for a confirmation.'
          );
          return this.PAYMENT_STATES.Processing;
        }
        if (res.request.href.indexOf('paypal.com') > -1) {
          this._logger.info('This website only supports Paypal.');
          return this.PAYMENT_STATES.Error;
        }
        if ($('div.notice--warning p.notice__text')) {
          if ($('div.notice--warning p.notice__text') === '') {
            this._logger.info(
              'An unknown error has occured, please try again.'
            );
            return this.PAYMENT_STATES.Error;
          }
          this._logger.info(
            'Notice Received: %s',
            $('div.notice--warning p.notice__text')
              .eq(0)
              .text()
          );
          return this.PAYMENT_STATES.Error;
        }
        this._logger.info('An unknown error has occured, pleas try again');
        return this.PAYMENT_STATES.Error;
      })
      .catch(err => {
        this._logger.info('An unknown error has occured, pleas try again');
        this._logger.debug('PAYMENT: Error submitting payment: %s', err);
        return {
          errors: err,
        };
      });
  }
}
module.exports = Payment;
