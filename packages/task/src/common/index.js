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
  ProxyManager,
  Timer,
  WebhookManager,
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
  Timer,
  AsyncQueue,
  ProxyManager,
  WebhookManager,
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
