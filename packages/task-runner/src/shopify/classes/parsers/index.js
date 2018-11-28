// Top Level Export for parsers
const Parser = require('./parser');
const AtomParser = require('./atomParser');
const JsonParser = require('./jsonParser');
const XmlParser = require('./xmlParser');

// Special Parsers
const DsmParser = require('./dsmParser');

function getSpecialParser(site) {
  // TODO: Figure out a better way to do this!
  switch(site.name) {
    case 'DSM SG':
    case 'DSM JP':
    case 'DSM US':
    case 'DSM EU': {
      return (...params) => new DsmParser(...params);
    }
    case 'Yeezy Supply':
    default: {
      return (...params) => new Parser(...params);
    }
  }
}

module.exports = {
  Parser,
  AtomParser,
  JsonParser,
  XmlParser,
  getSpecialParser,
};
