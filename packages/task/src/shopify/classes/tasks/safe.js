/* eslint-disable no-nested-ternary */
import cheerio from 'cheerio';
import { min, isEmpty } from 'lodash';
import { parse } from 'query-string';

import { Bases, Utils, Constants, Classes } from '../../../common';
import { Task as TaskConstants } from '../../constants';
import { Forms, stateForError, getHeaders, pickVariant } from '../utils';

const { addToCart, parseForm, patchCheckoutForm } = Forms;
const { Task, Manager, Platforms, Monitor } = Constants;
const { currencyWithSymbol, userAgent, waitForDelay, emitEvent } = Utils;
const { BaseTask } = Bases;

const { Events } = Task;
const { Events: TaskManagerEvents } = Manager;
const { States, Modes, StateMap } = TaskConstants;
const { ParseType } = Monitor;
const { Captcha } = Classes;

export default class SafeTaskPrimitive extends BaseTask {
  constructor(context) {
    super(context, States.GATHER_DATA);
  }

  async _handleLogin() {
    const nextState = await super._handleLogin();

    if (nextState === States.DONE) {
      if (this.context.task.product.variants) {
        emitEvent(
          this.context,
          [this.context.id],
          { message: 'Adding to cart' },
          Events.TaskStatus,
        );
        return States.ADD_TO_CART;
      }

      emitEvent(
        this.context,
        [this.context.id],
        { message: 'Waiting for product' },
        Events.TaskStatus,
      );
      return States.WAIT_FOR_PRODUCT;
    }
    return nextState;
  }

  async _handleCreateCheckout() {
    const {
      aborted,
      logger,
      task: {
        store: { url, apiKey },
        monitor,
        type,
      },
      proxy,
    } = this.context;

    // exit if abort is detected
    if (aborted) {
      logger.silly('Abort Detected, Stopping...');
      return States.ABORT;
    }

    try {
      const res = await this._fetch(`${url}/checkout`, {
        method: 'POST',
        compress: true,
        agent: proxy ? proxy.proxy : null,
        redirect: 'manual',
        follow: 0,
        headers: getHeaders({ url, apiKey }),
        body: JSON.stringify({}),
      });

      const { status, headers } = res;

      const nextState = stateForError(
        { status },
        {
          message: 'Creating checkout',
          nextState: States.CREATE_CHECKOUT,
        },
      );

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const redirectUrl = headers.get('location');
      logger.debug('Create checkout redirect url: %j', redirectUrl);
      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Going to checkpoint' },
            Events.TaskStatus,
          );
          this.checkpointUrl = redirectUrl;
          return States.GO_TO_CHECKPOINT;
        }

        if (/login/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Account needed' },
            Events.TaskStatus,
          );
          return States.ERROR;
        }

        if (/password/i.test(redirectUrl)) {
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Password page' },
            Events.TaskStatus,
          );
          this._delayer = waitForDelay(monitor, this._aborter.signal);
          await this._delayer;
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Creating checkout' },
            Events.TaskStatus,
          );
          return States.CREATE_CHECKOUT;
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._fetch(redirectUrl, {
              method: 'GET',
              compress: true,
              agent: proxy ? proxy.proxy : null,
              redirect: 'manual',
              follow: 0,
              headers: {
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': userAgent,
                connection: 'close',
                referer: url,
                accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9',
                host: `${url.split('/')[2]}`,
              },
            });
          } catch (error) {
            // fail silently...
          }

          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Polling queue' },
            Events.TaskStatus,
          );
          return States.QUEUE;
        }

        if (/checkouts/i.test(redirectUrl)) {
          [, , , this._store, , this._hash] = redirectUrl.split('/');

          if (type === Modes.SAFE) {
            emitEvent(
              this.context,
              [this.context.id],
              { message: 'Going to checkout' },
              Events.TaskStatus,
            );
            return States.GO_TO_CHECKOUT;
          }
          emitEvent(
            this.context,
            [this.context.id],
            { message: 'Submitting information' },
            Events.TaskStatus,
          );
          return States.SUBMIT_CUSTOMER;
        }
      }

      const message = status ? `Creating checkout (${status})` : 'Creating checkout';
      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.CREATE_CHECKOUT;
    } catch (err) {
      logger.error(
        'CHECKOUT: %d Request Error..\n Step: Create Checkout.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Creating checkout',
        nextState: States.CREATE_CHECKOUT,
      });

      if (nextState) {
        const { message, nextState: erroredState } = nextState;
        if (message) {
          emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
        }
        return erroredState;
      }

      const message =
        err.status || err.errno
          ? `Creating checkout (${err.status || err.errno})`
          : 'Creating checkout';

      emitEvent(this.context, [this.context.id], { message }, Events.TaskStatus);
      return States.CREATE_CHECKOUT;
    }
  }

  async _handleStepLogic(currentState) {
    const { logger } = this.context;
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    logger.silly('Handling state: %s', currentState);

    const stepMap = {
      [States.LOGIN]: this._handleLogin,
      [States.GATHER_DATA]: this._handleGatherData,
      [States.CREATE_CHECKOUT]: this._handleCreateCheckout,
      [States.GO_TO_CHECKPOINT]: this._handleGetCheckpoint,
      [States.SUBMIT_CHECKPOINT]: this._handleSubmitCheckpoint,
      [States.QUEUE]: this._handlePollQueue,
      [States.WAIT_FOR_PRODUCT]: this._handleWaitForProduct,
      [States.ADD_TO_CART]: this._handleAddToCart,
      [States.GO_TO_CART]: this._handleGoToCart,
      [States.GO_TO_CHECKOUT]: this._handleGetCheckout,
      [States.CAPTCHA]: this._handleCaptcha,
      [States.SUBMIT_CUSTOMER]: this._handleSubmitCustomer,
      [States.GO_TO_SHIPPING]: this._handleGetShipping,
      [States.SUBMIT_SHIPPING]: this._handleSubmitShipping,
      [States.GO_TO_PAYMENT]: this._handleGetPayment,
      [States.PAYMENT_TOKEN]: this._handlePaymentToken,
      [States.SUBMIT_PAYMENT]: this._handleSubmitPayment,
      [States.COMPLETE_PAYMENT]: this._handleCompletePayment,
      [States.PROCESS_PAYMENT]: this._handlePaymentProcess,
      [States.SWAP]: this._handleSwap,
      [States.DONE]: () => States.DONE,
      [States.ERROR]: () => States.DONE,
      [States.ABORT]: () => States.DONE,
    };

    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }
}
