const fs = require('fs');
const path = require('path');

const winston = require('winston');

// TODO: Generalize Env Code and Include it in this project
// For now we will assume that the nebula env gets loaded before
// and is available for us to use.
const _isDevelopment = process.env.NEBULA_ENV === 'development';
let _levels = null;

function _createLogger({ name, filename }) {
  // Check if the logs directory exists and create it if needed
  const dirname = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }

  // Define the transports to use for this logger
  const transports = [
    new winston.transports.File({ name: 'specific', filename: path.join(dirname, filename) }),
    new winston.transports.File({ name: 'combined', filename: path.join(dirname, 'combined.log') }),
  ];
  if (_isDevelopment || process.env.NEBULA_ENABLE_CONSOLE) {
    // Add console transport only when in dev mode or if we define the enable flag
    transports.push(new winston.transports.Console({
      name: 'console',
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.label({ label: name }),
        winston.format.timestamp(),
        winston.format.printf(info => `${info.timestamp}: [${info.level}] [${info.label}] - ${info.message}`),
      ),
    }));
  }

  // Add the logger with default format options
  winston.loggers.add(name, {
    levels: winston.config.npm.levels,
    level: _isDevelopment ? 'silly' : 'verbose', // Set it to silly in dev mode, but only verbose in prod (maybe info is better?)
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
  _levels = levels; // Update the state of levels for future loggers
  function adjustLevels(lvls, logger) {
    logger.transports.forEach(t => {
      if (!t.name) {
        t.level = lvls.all || t.level; // No name given, try setting to 'all' key if given
      } else {
        t.level = lvls[t.name] || lvls.all || t.level; // try setting specific name, then 'all', then no change
      }
    })
  }
  if (name) {
    const logger = winston.loggers.get(name);
    if (logger) {
      adjustLevels(levels, logger);
    }
  } else {
    winston.loggers.loggers.forEach(l => adjustLevels(levels, l));
  }
}

module.exports = {
  createLogger: _createLogger,
  setLevels: _setLevels,
};
