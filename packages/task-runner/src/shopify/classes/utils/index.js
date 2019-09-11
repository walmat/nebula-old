const { userAgent } = require('../../../common');
const { States } = require('./constants').TaskRunner;

const stateForError = ({ status, name, code }, { message, nextState }) => {
  // Look for errors in cause
  const match = /(ECONNRESET|ETIMEDOUT|ESOCKETTIMEDOUT|ENOTFOUND)/.exec(code);

  if (/aborterror/i.test(name)) {
    return { nextState: States.ABORT };
  }

  if (match) {
    // Check capturing group
    switch (match[1]) {
      // connection reset
      case 'ENOTFOUND':
      case 'ECONNRESET': {
        return {
          message: 'Swapping proxy',
          shouldBan: 0, // just swap with no ban
          nextState: States.SWAP,
        };
      }
      // request timeout or socket freeze timeout
      case 'ETIMEDOUT':
      case 'ESOCKETTIMEDOUT': {
        return { message, nextState };
      }
      default: {
        break;
      }
    }
  }

  // Check request status code
  let shouldBan = 0;
  switch (status) {
    case 403:
    case 429:
    case 430: {
      shouldBan = status === 403 ? 2 : 1;
      return {
        message: `Swapping proxy - (${status})`,
        shouldBan,
        nextState: States.SWAP,
      };
    }
    case 303: {
      return {
        message: 'Waiting in queue - (303)',
        nextState: States.QUEUE,
      };
    }
    default: {
      return status >= 500
        ? {
            message: `${message} - (${status})`,
            nextState,
          }
        : null;
    }
  }
};

const getHeaders = ({ url, apiKey }) => ({
  'X-Shopify-Checkout-Version': '2019-10-06',
  'X-Shopify-Access-Token': `${apiKey}`,
  'x-barba': 'yes',
  'User-Agent': userAgent,
  host: `${url.split('/')[2]}`,
  authorization: `Basic ${Buffer.from(`${apiKey}::`).toString('base64')}`,
});

module.exports = {
  stateForError,
  getHeaders,
};
