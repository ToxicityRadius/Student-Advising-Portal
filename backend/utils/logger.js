const pino = require('pino');
const pinoPretty = require('pino-pretty');

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')
  },
  isProduction
    ? undefined
    : pinoPretty({
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      })
);

module.exports = logger;
