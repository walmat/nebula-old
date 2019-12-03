// Top Level Export for parsers
import Parser from './parser';
import AtomParser from './standard/atomParser';
import JsonParser from './standard/jsonParser';
import XmlParser from './standard/xmlParser';

function getParsers(url) {
  if (/eflash|travis/i.test(url)) {
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

export { Parser, AtomParser, JsonParser, XmlParser, getParsers };
