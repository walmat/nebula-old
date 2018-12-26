// Top Level Export for parsers
const Parser = require('./parser');
const AtomParser = require('./atomParser');
const JsonParser = require('./jsonParser');
const XmlParser = require('./xmlParser');

const MOCK_SPECIAL_PARSER = process.env.NEBULA_RUNNER_MOCK_SPECIAL_PARSER || 'DSM US'; // Use the mock special parser from environment or default to DSM

// Special Parsers
const DsmParser = require('./dsmParser');
const YeezyParser = require('./yeezyParser');

async function getSpecialParser(site, logger) {
  // TODO: Figure out a better way to do this!
  logger.verbose('PARSER: Choosing parser based off site name: %s', site.name);
  switch (site.name) {
    case 'Mock Server': {
      logger.verbose('inside of getSpecialParser')
      return getSpecialParser({ name: MOCK_SPECIAL_PARSER });
    }
    case 'DSM SG':
    case 'DSM JP':
    case 'DSM US':
    case 'DSM EU': {
      logger.verbose('inside of getSpecialParser');

      return (...params) => new DsmParser(...params);
    }
    case 'Yeezy Supply': {
      logger.verbose('inside of getSpecialParser');
      return (...params) => new YeezyParser(...params);
    }
    default: {
      logger.verbose('inside of getSpecialParser');
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
