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
    captchaRequest,
    captchaQueue,
    captchaToken,
  }) {
    this.id = id;
    this.ids = [id];
    this.task = task;
    this.parseType = parseType;
    this.lastProxy = proxy;
    this.proxy = proxy;
    this.message = message;
    this.events = events;
    this.jar = jar;
    this.logger = logger;
    this.discord = discord;
    this.slack = slack;
    this.aborted = aborted;
    this.harvestState = harvestState;
    this.captchaRequest = captchaRequest;
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
}
