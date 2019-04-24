const fs = require('fs');
const winston = require('winston');
const path = require('path');
// Require DRF to add it to the list of transports
require('winston-daily-rotate-file');

// TODO: Generalize Env Code and Include it in this project
// For now we will assume that the nebula env gets loaded before
// and is available for us to use.
const _isDevelopment = process.env.NEBULA_ENV === 'development';
let _levels = null;

/**
 * Set the levels of all loggers or a specific logger
 *
 * Use the given levels object to set the levels of a
 * given logger (based on name) or all loggers (no
 * name given).
 *
 * The levels object should contain individual keys
 * for each transport:
 * - 'specific': The logger specific file
 * - 'combined': The combined level
 * - 'console': The console transport
 * Optionally, you can set the level for all
 * transports by passing the 'all' key. Individual
 * settings will override the 'all' key if both
 * are passed.
 */
function _setLevels(levels, name) {
  if (!levels) {
    return; // if no levels are given, don't do anything...
  }
  function adjustLevels(lvls, logger) {
    /* eslint-disable no-param-reassign */
    logger.transports.forEach(t => {
      if (!t.name) {
        t.level = lvls.all || t.level; // No name given, try setting to 'all' key if given
      } else {
        t.level = lvls[t.name] || lvls.all || t.level; // try setting specific name, then 'all', then no change
      }
    });
    /* eslint-enable no-param-reassign */
  }
  if (name) {
    const logger = winston.loggers.get(name);
    if (logger) {
      adjustLevels(levels, logger);
    }
  } else {
    _levels = levels; // Update the state of levels for future loggers
    winston.loggers.loggers.forEach(l => adjustLevels(levels, l));
  }
}

function _createLogger({ dir, name, prefix }) {
  // disable logger
  if (process.env.NEBULA_DISABLE_LOGGER) {
    return {
      error: () => {},
      warn: () => {},
      info: () => {},
      verbose: () => {},
      debug: () => {},
      silly: () => {},
      log: () => {},
    };
  }

  const dirname = path.join(dir, 'Nebula Orion');
  const auditFile = path.join(dirname, 'audit.json');

  // Check if the logs directory exists and create it if needed
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  } else if (!fs.existsSync(auditFile)) {
    // Logs directory exists but audit file doesn't exist, we weren't using DRF previously so we need to
    // remove all existing log files in this directory
    try {
      const recursiveRemove = dirPath => {
        const files = fs.readdirSync(dirPath);
        files.forEach(f => {
          const fPath = path.join(dirPath, f);
          if (fs.statSync(fPath).isFile()) {
            fs.unlinkSync(fPath);
          } else {
            recursiveRemove(fPath);
          }
        });
      };
      recursiveRemove(dirname);
    } catch (_) {
      // Fail silently...
    }
  }

  const maxSize = name === 'TaskManager' ? '250m' : '50m';

  // Define the transports to use for this logger
  const transports = [
    new winston.transports.DailyRotateFile({
      name: 'specific',
      datePattern: 'WW-YYYY',
      dirname,
      filename: `${prefix}-%DATE%.log`,
      maxSize,
      maxFiles: '7d',
      auditFile,
    }),
    new winston.transports.DailyRotateFile({
      name: 'combined',
      datePattern: 'WW-YYYY',
      dirname,
      filename: 'combined-%DATE%.log',
      maxSize: '500m',
      maxFiles: '7d',
      auditFile,
    }),
  ];

  if (_isDevelopment || process.env.NEBULA_ENABLE_CONSOLE) {
    // Add console transport only when in dev mode or if we define the enable flag
    transports.push(
      new winston.transports.Console({
        name: 'console',
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.label({ label: name }),
          winston.format.timestamp(),
          winston.format.printf(
            info => `${info.timestamp}: [${info.level}] [${info.label}] - ${info.message}`,
          ),
        ),
      }),
    );
  }

  // Add the logger with default format options
  winston.loggers.add(name, {
    levels: winston.config.npm.levels,
    level: _isDevelopment ? 'silly' : 'verbose', // Set it to silly in dev mode, but verbose in prod
    transports,
    format: winston.format.combine(
      winston.format.label({ label: name }),
      winston.format.timestamp(),
      winston.format.splat(),
      winston.format.json(),
      winston.format.prettyPrint(),
    ),
  });
  // Update levels to the global state
  _setLevels(_levels, name);
  return winston.loggers.get(name);
}

module.exports = {
  createLogger: _createLogger,
  setLevels: _setLevels,
};
