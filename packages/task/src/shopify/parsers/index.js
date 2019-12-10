// Top Level Export for parsers
import CollectionParser from './collectionParser';
import JsonParser from './jsonParser';
import XmlParser from './xmlParser';

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
