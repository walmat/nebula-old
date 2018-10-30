// Split out into separate file for clarity
// TODO Restucture this back into utils
const _ = require('underscore');
module.exports = {};

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
 * @param {List<Promise>} promises 
 */
function resolveFirstRejectLast(promises) {
  return new Promise((resolve, reject) => {
    console.log('[TRACE]: RFRL: Starting...');
    const errorCount = 0;
    const status = {
      winner: null,
      errors: new Array(promises.length),
    }
  
    console.log('[TRACE]: RFRL: Attaching Handlers...');
    _.forEach(promises, (p, idx) => {
      p.then(
        (resolved) => {
          console.log(`[TRACE]: RFRL - ${idx}: RESOLVE\n${resolved}`);
          if (!status.winner) {
            console.log(`[TRACE]: RFRL - ${idx}: Chosen as WINNER`);
            status.winner = resolved;
            resolve(resolved);
          } else {
            console.log(`[TRACE]: RFRL - ${idx}: Not chosen as WINNER`);
          }
        },
        (error) => {
          console.log(`[TRACE]: RFRL - ${idx}: REJECTED\n${error}`);
          status.errors[idx] = error;
          errorCount += 1;
          if (errorCount >= status.errors.length && !status.winner) {
            console.log(`[TRACE]: RFRL - ${idx}: Final error detected, rejecting.`);
            reject(status);
          } else {
            console.log(`[TRACE]: RFRL - ${idx}: Not the final error, there's still hope!`);
          }
        },
      );
    });
    console.log('[TRACE]: RFRL: Sync work done, waiting on promises...');
  });
}
module.exports.rfrl = resolveFirstRejectLast;