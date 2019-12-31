/* eslint-disable no-nested-ternary */
import cheerio from 'cheerio';
import { min, isEmpty } from 'lodash';
import { parse } from 'query-string';

import { Bases, Utils, Constants, Classes } from '../../../common';
import { Task as TaskConstants } from '../../constants';
import { Forms, stateForError, getHeaders, pickVariant } from '../../utils';

const { addToCart, parseForm, patchCheckoutForm } = Forms;
const { Task, Manager, Platforms, Monitor } = Constants;
const { currencyWithSymbol, userAgent, waitForDelay, emitEvent } = Utils;
const { BaseTask } = Bases;

const { Events } = Task;
const { Events: TaskManagerEvents } = Manager;
const { States, Modes, StateMap } = TaskConstants;
const { ParseType } = Monitor;
const { Captcha } = Classes;

export default class FastTaskPrimitive extends BaseTask {
  constructor(context) {
    super(context, States.CREATE_CHECKOUT);
  }

//   async _handleLogin() {
//     const nextState = await super._handleLogin();

//     if (nextState === States.DONE) {
//       emitEvent(
//         this.context,
//         [this.context.id],
//         { message: 'Creating checkout' },
//         Events.TaskStatus,
//       );
//       return States.CREATE_CHECKOUT;
//     }

//     return nextState;
//   }

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
