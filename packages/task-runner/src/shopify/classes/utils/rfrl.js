// Split out into separate file for clarity
const _ = require('underscore');

/**
 * Resolve the first Promise, Reject when all have failed
 *
 * This method accepts a list of promises and has them
 * compete in a horserace to determine which promise can
 * resolve first (similar to Promise.race). However, this
 * method differs why waiting to reject until ALL promises
 * have rejected, rather than waiting for the first.
 *
 * The return of this method is a promise that either resolves
 * to the first promises resolved value, or rejects with an arra
 * of errors (with indexes corresponding to the promises).
 *
 * @param {List<Promise>} promises list of promises to run
 * @param {String} tag optional tag to attach to log statements
 */
function resolveFirstRejectLast(promises, tag, logger) {
  const _logger = logger || { log: () => {} };
  const tagStr = tag ? ` - ${tag}` : '';
  return new Promise((resolve, reject) => {
    _logger.log('silly', 'RFRL%s: Starting...', tagStr);
    let errorCount = 0;
    const status = {
      winner: null,
      errors: new Array(promises.length),
    };
    _logger.log('silly', '[ASYNC] RFRL%s: Attaching Handlers...', tagStr);
    _.forEach(promises, (p, idx) => {
      p.then(
        resolved => {
          _logger.log(
            'silly',
            '[ASYNC] RFRL%s - %d: RESOLVE',
            tagStr,
            idx,
            resolved
          );
          if (!status.winner) {
            _logger.log(
              'silly',
              '[ASYNC] RFRL%s - %d: Chosen as WINNER',
              tagStr,
              idx
            );
            status.winner = resolved;
            resolve(resolved);
          } else {
            _logger.log(
              'silly',
              '[ASYNC] RFRL%s - %d: Not chosen as WINNER',
              tagStr,
              idx
            );
          }
        },
        error => {
          _logger.log(
            'silly',
            '[ASYNC] RFRL%s - %d: REJECTED',
            tagStr,
            idx,
            error
          );
          status.errors[idx] = error;
          errorCount += 1;
          if (errorCount >= status.errors.length && !status.winner) {
            _logger.log(
              'silly',
              '[ASYNC] RFRL%s - %d: Final error detected, rejecting.',
              tagStr,
              idx
            );
            reject(status.errors);
          } else {
            _logger.log(
              'silly',
              "[ASYNC] RFRL%s - %d: Not the final error, there's still hope!",
              tagStr,
              idx
            );
          }
        }
      );
    });
    _logger.log(
      'silly',
      'RFRL%s: Sync work done, waiting on promises...',
      tagStr
    );
  });
}

module.exports = resolveFirstRejectLast;
