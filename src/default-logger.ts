/* eslint-disable no-console */
import { ILogger } from './types';

export class DefaultLogger implements ILogger {
  info(message: any, ...meta: any[]): void {
    console.log(message, ...meta);
  }
  warn(message: any, ...meta: any[]): void {
    console.warn(message, ...meta);
  }
  error(message: any, ...meta: any[]): void {
    console.error(message, ...meta);
  }
  debug(message: any, ...meta: any[]): void {
    console.debug(message, ...meta);
  }
  silly(message: any, ...meta: any[]): void {
    console.debug(message, ...meta);
  }
}
