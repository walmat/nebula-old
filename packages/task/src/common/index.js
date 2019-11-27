import now from 'performance-now';

import Constants from './constants';

import {
  Captcha,
  Context,
  capitalizeFirstLetter,
  createLogger,
  currencyWithSymbol,
  deregisterForEvent,
  emitEvent,
  getRandomIntInclusive,
  reflect,
  registerForEvent,
  rfrl,
  setLevels,
  trimKeywords,
  userAgent,
  waitForDelay,
  compareProductData,
} from './utils';
import { AsyncQueue, ProxyManager, WebhookManager, BaseTask, BaseMonitor, Timer } from './classes';

export {
  now,
  rfrl,
  waitForDelay,
  reflect,
  userAgent,
  trimKeywords,
  compareProductData,
  getRandomIntInclusive,
  capitalizeFirstLetter,
  currencyWithSymbol,
  Captcha,
  BaseTask,
  BaseMonitor,
  Timer,
  Constants,
  AsyncQueue,
  Context,
  ProxyManager,
  WebhookManager,
  createLogger,
  setLevels,
  emitEvent,
  registerForEvent,
  deregisterForEvent,
};
