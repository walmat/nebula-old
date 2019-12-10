import EventEmitter from 'eventemitter3';
import { CookieJar } from 'tough-cookie';

import { Timer } from '../classes';
import { Task as TaskConstants } from '../constants';

const { HarvestStates, Types } = TaskConstants;

export default class Context {
  constructor({
    id,
    task,
    type = Types.Normal,
    parseType,
    proxy,
    message = '',
    events = new EventEmitter(),
    jar = new CookieJar(),
    logger,
    discord,
    slack,
    aborted = false,
    proxyManager,
    webhookManager,
    harvestState = HarvestStates.idle,
    captchaRequest = null,
    captchaQueue = null,
    captchaToken = null,
  }) {
    this.id = id;
    this.ids = [id];
    this.task = task;
    this.type = type;
    this.parseType = parseType;
    this.proxy = proxy;
    this.lastProxy = proxy;
    this.message = message;
    this.events = events;
    this.timers = {
      checkout: new Timer(),
      monitor: new Timer(),
    };
    this.jar = jar;
    this.logger = logger;
    this.discord = discord;
    this.slack = slack;
    this.aborted = aborted;
    this.proxyManager = proxyManager;
    this.webhookManager = webhookManager;
    this.harvestState = harvestState;
    this.captchaRequest = captchaRequest;
    this.captchaQueue = captchaQueue;
    this.captchaToken = captchaToken;
  }

  addId(id) {
    this.ids.push(id);
  }

  isEmpty() {
    return !this.ids.length;
  }

  hasId(id) {
    return this.ids.some(i => i === id);
  }

  removeId(id) {
    this.ids = this.ids.filter(i => i !== id);
  }

  setParseType(parseType) {
    this.parseType = parseType;
  }

  setLastProxy(lastProxy) {
    this.lastProxy = lastProxy;
  }

  setProxy(proxy) {
    this.proxy = proxy;
  }

  setMessage(message) {
    this.message = message;
  }

  setEvents(events) {
    this.events = events;
  }

  setJar(jar) {
    this.jar = jar;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  setDiscord(discord) {
    this.discord = discord;
  }

  setSlack(slack) {
    this.slack = slack;
  }

  setAborted(aborted) {
    this.aborted = aborted;
  }

  setProductFound(productFound) {
    this.productFound = productFound;
  }

  setHarvestState(harvestState) {
    this.harvestState = harvestState;
  }

  setCaptchaRequest(captchaRequest) {
    this.captchaRequest = captchaRequest;
  }

  setCaptchaQueue(captchaQueue) {
    this.captchaQueue = captchaQueue;
  }

  setCaptchaToken(captchaToken) {
    this.captchaToken = captchaToken;
  }

  updateVariant(variant) {
    this.task.product = {
      ...this.task.product,
      variant,
    };
  }
}
