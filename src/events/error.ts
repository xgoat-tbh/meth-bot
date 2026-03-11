import { logger } from '../utils/logger';

export function errorHandler(error: Error): void {
  logger.error('Unhandled client error', { error: error.message, stack: error.stack });
}

export function warnHandler(info: string): void {
  logger.warn(`Discord.js warning: ${info}`);
}
