// Top Level Export for parsers
const Parser = require('./parser');
const AtomParser = require('./atomParser');
const JsonParser = require('./jsonParser');
const XmlParser = require('./xmlParser');

const MOCK_SPECIAL_PARSER = process.env.NEBULA_RUNNER_MOCK_SPECIAL_PARSER || 'DSM US'; // Use the mock special parser from environment or default to DSM

// Special Parsers
const { DsmParser, DsmUsParser, DsmUkParser } = require('./dsm');
const YeezyParser = require('./yeezyParser');

function getSpecialParser(site) {
  // TODO: Figure out a better way to do this!
  switch (site.name) {
    case 'Mock Server': {
      return getSpecialParser({ name: MOCK_SPECIAL_PARSER });
    }
    case 'DSM SG':
    case 'DSM JP': {
      return (...params) => new DsmParser(...params);
    }
    case 'DSM US': {
      return (...params) => new DsmUsParser(...params);
    }
    case 'DSM UK': {
      return (...params) => new DsmUkParser(...params);
    }
    case 'Yeezy Supply':
    case 'Yeezy Supply 350':
    case 'Yeezy Supply 700': {
      return (...params) => new YeezyParser(...params);
    }
    default: {
      return (...params) => new YeezyParser(...params);
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
