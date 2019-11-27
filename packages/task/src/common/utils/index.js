import delay from 'delay';
import { isEqual } from 'lodash';

import { getCaptcha, stopHarvestCaptcha, suspendHarvestCaptcha } from './captcha';
import { Task, Monitor } from '../constants';
import { createLogger, setLevels } from './logger';
import rfrl from './rfrl';
import Context from './context';

const { ParseType } = Monitor;

export const waitForDelay = (time, signal) => delay(time, { signal });
export const reflect = p =>
  p.then(v => ({ v, status: 'fulfilled' }), e => ({ e, status: 'rejected' }));
export const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; LCTE; rv:11.0) like Gecko';

export const trimKeywords = input => {
  const ret = [];
  input.map(word =>
    word
      .trim()
      .substring(1, word.length)
      .toUpperCase(),
  );
  return ret;
};

export const capitalizeFirstLetter = sentence =>
  sentence
    .toLowerCase()
    .split(' ')
    .map(s => s.charAt(0).toUpperCase() + s.substring(1))
    .join(' ');

export const getRandomIntInclusive = (min, max) => {
  const randMin = Math.ceil(min);
  const randMax = Math.floor(max);
  return Math.floor(Math.random() * (randMax - randMin + 1)) + randMin;
};

export const currencyWithSymbol = (price, name) => {
  switch (name) {
    case 'usd':
    case 'USD': {
      return `$${price}`;
    }
    case 'cad':
    case 'CAD': {
      return `$${price} CAD`;
    }
    case 'eur':
    case 'EUR': {
      return `€${price}`;
    }
    case 'gbp':
    case 'GBP': {
      return `£${price}`;
    }
    default: {
      return price;
    }
  }
};

export const registerForEvent = (event, context, cb) => {
  const { events } = context;
  events.on(event, cb);
};

export const deregisterForEvent = (event, context, cb) => {
  const { events } = context;
  events.removeListener(event, cb);
};

const _emitEvent = (context, ids, event, payload) => {
  const { logger, events } = context;
  events.emit(event, ids, payload, event);
  logger.silly('Event %s emitted: %j', event, payload);
};

export const emitEvent = (context, ids, payload = {}, event, type = Task.Types.Normal) => {
  const { message } = payload;
  if (message && message !== context.messsage) {
    context.setMessage(message);
    _emitEvent(context, ids, event, { ...payload, type });
  }
};

export const compareProductData = async (product1, product2, parseType) => {
  // we only care about keywords/url matching here...
  switch (parseType) {
    case ParseType.Keywords: {
      const { pos_keywords: posKeywords, neg_keywords: negKeywords } = product1;
      const samePositiveKeywords = isEqual(product2.pos_keywords.sort(), posKeywords.sort());
      const sameNegativeKeywords = isEqual(product2.neg_keywords.sort(), negKeywords.sort());
      return samePositiveKeywords && sameNegativeKeywords;
    }
    case ParseType.Url: {
      const { url } = product1;
      return product2.url.toUpperCase() === url.toUpperCase();
    }
    case ParseType.Variant: {
      return product1.variant === product2.variant;
    }
    default:
      return false;
  }
};

const Captcha = {
  getCaptcha,
  stopHarvestCaptcha,
  suspendHarvestCaptcha,
};

export { Captcha, Context, createLogger, setLevels, rfrl };
