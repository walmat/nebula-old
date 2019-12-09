// Top Level Export for parsers
import CollectionParser from './standard/collectionParser';
import JsonParser from './standard/jsonParser';
import XmlParser from './standard/xmlParser';

function getParsers(url) {
  if (/eflash|travis/i.test(url)) {
    return (...params) => [new JsonParser(...params)];
  }

  if (/kith/i.test(url)) {
    return (...params) => [new JsonParser(...params), new CollectionParser(...params)];
  }

  return (...params) => [
    new JsonParser(...params),
    new CollectionParser(...params),
    new XmlParser(...params),
  ];
}

export { CollectionParser, JsonParser, XmlParser, getParsers };
