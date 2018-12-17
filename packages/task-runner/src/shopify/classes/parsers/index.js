// Top Level Export for parsers
const Parser = require('./parser');
const AtomParser = require('./atomParser');
const JsonParser = require('./jsonParser');
const XmlParser = require('./xmlParser');

const MOCK_SPECIAL_PARSER = process.env.NEBULA_RUNNER_MOCK_SPECIAL_PARSER || 'DSM US'; // Use the mock special parser from environment or default to DSM

// Special Parsers
const DsmParser = require('./dsmParser');
const YeezyParser = require('./yeezyParser');

function getSpecialParser(site) {
  // TODO: Figure out a better way to do this!
  switch (site.name) {
    case 'Mock Server': {
      return getSpecialParser({ name: MOCK_SPECIAL_PARSER });
    }
    case 'DSM SG':
    case 'DSM JP':
    case 'DSM US':
    case 'DSM EU': {
      return (...params) => new DsmParser(...params);
    }
    case 'Yeezy Supply':
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
