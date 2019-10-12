// Top Level Export for parsers
const Parser = require('./parser');
const AtomParser = require('./atomParser');
const JsonParser = require('./jsonParser');
const XmlParser = require('./xmlParser');

// Special Parsers
const TravissParser = require('./travis');
const { DsmParser, DsmUsParser, DsmUkParser } = require('./dsm');
const YeezyParser = require('./yeezyParser');

function getSpecialParser({ name }) {
  // TODO: Figure out a better way to do this!
  if (/dsm sg|dsm jp/i.test(name)) {
    return (...params) => new DsmParser(...params);
  }

  if (/dsm us/i.test(name)) {
    return (...params) => new DsmUsParser(...params);
  }

  if (/dsm uk/i.test(name)) {
    return (...params) => new DsmUkParser(...params);
  }

  if (/yeezy supply/i.test(name)) {
    return (...params) => new YeezyParser(...params);
  }

  if (/traviss/i.test(name)) {
    return (...params) => new TravissParser(...params);
  }

  return (...params) => new YeezyParser(...params);

}

function getParsers(url) {
  if (/yeezysupply|eflash|traviss/i.test(url)) {
    return (...params) => [new JsonParser(...params)];
  }

  if (/kith/i.test(url)) {
    return (...params) => [new JsonParser(...params), new AtomParser(...params)];
  }

  return (...params) => [
    new JsonParser(...params),
    new AtomParser(...params),
    new XmlParser(...params),
  ];
}

module.exports = {
  Parser,
  AtomParser,
  JsonParser,
  XmlParser,
  getSpecialParser,
  getParsers,
};
