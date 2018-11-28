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
      return DsmParser;
    }
    case 'Yeezy Supply':
    default: {
      return Parser;
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
