// import { LOG_LEVEL } from "~root/config";
import { inspect } from 'util';
import winston from 'winston';
import 'dotenv/config';

/**
 * Formats error information in log messages.
 * If the message is a stringified JSON, it tries to parse it back to JSON.
 *
 * @param {any} info - The logging information object.
 * @returns {any} - The formatted logging information.
 */
const formatError = (info: any) => {
  if (info instanceof Error) {
    return {
      ...info,
      message: info.message,
      stack: info.stack,
      ...Object.getOwnPropertyNames(info).reduce(
        (acc: { [key: string]: any }, key) => {
          if (key !== 'message' && key !== 'stack') {
            acc[key] = (info as any)[key];
          }
          return acc;
        },
        {}
      ),
    };
  } else if (
    info.message &&
    typeof info.message === 'string' &&
    info.message.startsWith('{')
  ) {
    try {
      info.message = JSON.parse(info.message);
    } catch (e) {
      logger.debug('e :>> ', e);
    }
  }
  return info;
};

/**
 * A winston log format that provides human-readable output.
 * It combines colorization, custom error formatting, and pretty-printing of messages and metadata.
 */
const humanReadableFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format((info) => formatError(info))(),
  winston.format.printf(({ message, level, ...metadata }) => {
    const cleanedMetadata = Object.entries(metadata).reduce<{
      [key: string]: any;
    }>((acc, [key, value]) => {
      if (typeof key === 'symbol') {
        acc[String(key)] = value;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});

    const rest = Object.keys(cleanedMetadata).length
      ? inspect(cleanedMetadata, { depth: null })
      : '';
    return `${level} => ${inspect(message, {
      colors: true,
      depth: null,
    })} ${rest}`;
  })
);

// eslint-disable-next-line no-constant-condition
const format = process.env.LOG_HUMAN
  ? humanReadableFormat
  : winston.format.json();

/**
 * The logger instance.
 * Configured with a log level and format based on environment variables.
 * It includes a console transport that handles exceptions and uses the defined format.
 */
export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      format,
    }),
  ],
  format,
  exitOnError: false,
  level: process.env.LOG_LEVEL,
});
