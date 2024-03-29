// Top Level Export for parsers
import Parser from './parser';
import AtomParser from './standard/atomParser';
import JsonParser from './standard/jsonParser';
import XmlParser from './standard/xmlParser';

// Special Parsers
import TravisParser from './travis';
import YeezyParser from './yeezysupply';
import { DsmParser, DsmUkParser, DsmUsParser } from './dsm';

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
    return (...params) => new TravisParser(...params);
  }

  return (...params) => new YeezyParser(...params);
}

function getParsers(url) {
  if (/yeezysupply|eflash|travis/i.test(url)) {
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

export { Parser, AtomParser, JsonParser, XmlParser, getSpecialParser, getParsers };
