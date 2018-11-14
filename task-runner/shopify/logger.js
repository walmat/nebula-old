const fs = require('fs');
const path = require('path');

const winston = require('winston');

function _createLogger({ name, filename }) {
  // Check if the logs directory exists and create it if needed
  const dirname = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  // Add the logger with default format options
  winston.loggers.add(name, {
    levels: winston.config.npm.levels,
    level: 'silly', // TODO Adjust this maybe?
    transports: [
      new winston.transports.File({ filename: path.join(dirname, filename) }),
      new winston.transports.File({ filename: path.join(dirname, 'combined.log') }),
      new winston.transports.Console({
        // level: 'info', // TODO Adjust this to add the console transport only when in dev mode
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.label({ label: name }),
          winston.format.timestamp(),
          winston.format.printf(info => `${info.timestamp}: [${info.level}] [${info.label}] - ${info.message}`),
        ),
      }),
    ],
    format: winston.format.combine(
      winston.format.label({ label: name }),
      winston.format.timestamp(),
      winston.format.splat(),
      winston.format.json(),
      winston.format.prettyPrint(),
    ),
  });
  return winston.loggers.get(name);
}

module.exports = _createLogger;
