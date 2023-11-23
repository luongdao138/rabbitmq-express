import winston, { Logger } from 'winston';
import { ConsoleTransportInstance } from 'winston/lib/winston/transports';
import chalk from 'chalk';
import _ from 'lodash';

const LOG_LEVEL = 'debug';
const NODE_ENV = process.env.ENV || 'development';
const IS_DEV = NODE_ENV === 'development';
const DEFAULT_LABEL = 'Palbox';

const loggerMap = new Map<string, Logger>();

function getTransports(label: string) {
  const transports: ConsoleTransportInstance[] = [];
  if (!IS_DEV) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );
  } else {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
          }),
          winston.format.errors({ stack: true }),
          winston.format.json(),
          winston.format.cli(),
          winston.format.splat(),
          winston.format.label({ label }),
          winston.format.printf((info) => {
            return `[${chalk.cyan(`${info.timestamp}`)}]  [${chalk.yellow(
              info.label || DEFAULT_LABEL,
            )}]  [${info.level}]:${info.message}`;
          }),
        ),
      }),
    );
  }

  return transports;
}

export type LogLevel = 'info' | 'debug' | 'warn' | 'error' | 'silly';
const levelScore = {
  silly: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

export class PalboxLoggerOptions {
  label?: string;
  shouldLog?:
    | boolean
    | {
        envs?: '*' | string[];
        level?: '*' | LogLevel;
      };
}

export class PalboxLogger {
  private _logger: Logger;
  private _options: PalboxLoggerOptions;

  constructor(options: PalboxLoggerOptions = {}) {
    this._options = options;
    let { label } = options;
    label = label || DEFAULT_LABEL;

    const existLogger = loggerMap.get(label);

    if (existLogger) {
      this._logger = existLogger;
      return;
    }

    this._logger = winston.createLogger({
      level: LOG_LEVEL,
      levels: winston.config.npm.levels,
      transports: getTransports(label),
    });
    loggerMap.set(label, this._logger);
  }

  private checkLevel(logLevel: LogLevel, comparedLevel: LogLevel) {
    return levelScore[logLevel] - levelScore[comparedLevel] >= 0;
  }

  private shouldLog(
    logLevel: LogLevel,
    logOptions: PalboxLoggerOptions = this._options,
  ) {
    const { shouldLog } = logOptions;

    if (_.isNil(shouldLog)) return true;
    if (typeof shouldLog === 'boolean') return shouldLog;

    const { envs, level } = shouldLog;
    let canLog = true;

    if (envs && envs !== '*') {
      canLog = envs.includes(NODE_ENV);
    }

    if (level && level !== '*') {
      canLog = this.checkLevel(logLevel, level);
    }

    return canLog;
  }

  public log(
    level: LogLevel,
    options: PalboxLoggerOptions = {},
    ...args: any[]
  ) {
    const canLog = this.shouldLog(
      level,
      _.merge(_.cloneDeep(this._options), options),
    );
    if (!canLog) return;

    this._logger[level](args[0], ...args.slice(1));
  }

  public info(message: any, ...meta: any[]) {
    this.log('info', {}, message, ...meta);
  }

  public warn(message: any, ...meta: any[]) {
    this.log('warn', {}, message, ...meta);
  }

  public error(message: any, ...meta: any[]) {
    this.log('error', {}, message, ...meta);
  }

  public debug(message: any, ...meta: any[]) {
    this.log('debug', {}, message, ...meta);
  }

  public silly(message: any, ...meta: any[]) {
    this.log('silly', {}, message, ...meta);
  }
}

const logger = new PalboxLogger();
export default logger;
