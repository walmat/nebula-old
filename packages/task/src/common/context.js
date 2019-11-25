export default class Context {
  constructor({
    id,
    task,
    parseType,
    proxy,
    message,
    events,
    jar,
    logger,
    discord,
    slack,
    aborted,
    harvestState,
    captchaQueue,
    captchaToken,
  }) {
    this.id = id;
    this.ids = [id];
    this.task = task;
    this.parseType = parseType;
    this.proxy = proxy;
    this.message = message;
    this.events = events;
    this.jar = jar;
    this.logger = logger;
    this.discord = discord;
    this.slack = slack;
    this.aborted = aborted;
    this.harvestState = harvestState;
    this.captchaQueue = captchaQueue;
    this.captchaToken = captchaToken;
  }

  addId(id) {
    this.ids.push(id);
  }

  hasId(id) {
    return this.ids.some(i => i === id);
  }

  removeId(id) {
    this.ids.filter(i => i !== id);
  }

  parseType(parseType) {
    this.parseType = parseType;
  }

  proxy(proxy) {
    this.proxy = proxy;
  }

  message(message) {
    this.message = message;
  }

  events(events) {
    this.events = events;
  }

  jar(jar) {
    this.jar = jar;
  }

  logger(logger) {
    this.logger = logger;
  }

  discord(discord) {
    this.discord = discord;
  }

  slack(slack) {
    this.slack = slack;
  }

  aborted(aborted) {
    this.aborted = aborted;
  }

  harvestState(harvestState) {
    this.harvestState = harvestState;
  }

  captchaQueue(captchaQueue) {
    this.captchaQueue = captchaQueue;
  }

  captchaToken(captchaToken) {
    this.captchaToken = captchaToken;
  }
}
