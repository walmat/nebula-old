const fs = require('fs');
const path = require('path');

const winston = require('winston');

function _createLogger({ name, filename }) {
  const dirname = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  return winston.createLogger({
    levels: winston.config.npm.levels,
    transports: [
      new winston.transports.Console({
        level: 'info',
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.prettyPrint(),
          winston.format.printf(info => `${new Date().toISOString()}: [${info.level}] [${name}] - ${info.message}`),
        ),
      }),
      new winston.transports.File({ filename: path.join(dirname, 'combined.log') }),
      new winston.transports.File({ filename: path.join(dirname, filename) }),
    ],
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.simple(),
      winston.format.label({ label: name}),
      winston.format.timestamp(),
      winston.format.prettyPrint(),
    ),
  });
}

module.exports = _createLogger;
