// Constants
import { ErrorCodes, Manager, Monitor, Platforms, SiteKeyForPlatform, Task } from './constants';

// Utils
import {
  capitalizeFirstLetter,
  compareProductData,
  createLogger,
  currencyWithSymbol,
  deregisterForEvent,
  emitEvent,
  getRandomIntInclusive,
  now,
  reflect,
  registerForEvent,
  rfrl,
  setLevels,
  trimKeywords,
  userAgent,
  waitForDelay,
} from './utils';

// Classes
import {
  AsyncQueue,
  BaseMonitor,
  BaseTask,
  Captcha,
  Secure,
  Discord,
  SecureManager,
  Slack,
  ProxyManager,
  Timer,
  WebhookManager,
  CaptchaManager,
} from './classes';

import Context from './context';

const Utils = {
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
  emitEvent,
  registerForEvent,
  deregisterForEvent,
  createLogger,
  setLevels,
};

const Classes = {
  Captcha,
  Secure,
  Discord,
  Slack,
  Timer,
  AsyncQueue,
  ProxyManager,
  WebhookManager,
  CaptchaManager,
  SecureManager,
};

const Bases = {
  BaseMonitor,
  BaseTask,
  Context,
};

const Constants = {
  ErrorCodes,
  Manager,
  Monitor,
  Platforms,
  SiteKeyForPlatform,
  Task,
};

// re-exports
export { Utils, Classes, Context, Bases, Constants };
