import { log } from 'crawlee';

export type LogTag =
  | 'DISCOVERY'
  | 'NORMALIZATION'
  | 'DEDUPE'
  | 'WEBSITE'
  | 'ENRICH'
  | 'SCORE'
  | 'OUTPUT'
  | 'SUMMARY'
  | 'ERROR'
  | 'WARN';

class AppLogger {
  info(tag: LogTag, message: string, data?: unknown): void {
    if (data !== undefined) {
      log.info(`[${tag}] ${message} ${typeof data === 'object' ? JSON.stringify(data) : data}`);
    } else {
      log.info(`[${tag}] ${message}`);
    }
  }

  debug(tag: LogTag, message: string, data?: unknown): void {
    if (data !== undefined) {
      log.debug(`[${tag}] ${message} ${typeof data === 'object' ? JSON.stringify(data) : data}`);
    } else {
      log.debug(`[${tag}] ${message}`);
    }
  }

  warn(tag: LogTag, message: string, data?: unknown): void {
    if (data !== undefined) {
      log.warning(`[${tag}] ${message} ${typeof data === 'object' ? JSON.stringify(data) : data}`);
    } else {
      log.warning(`[${tag}] ${message}`);
    }
  }

  error(tag: LogTag, message: string, error?: unknown): void {
    if (error instanceof Error) {
      log.error(`[${tag}] ${message}: ${error.message}\n${error.stack ?? ''}`);
    } else if (error !== undefined) {
      log.error(`[${tag}] ${message}: ${JSON.stringify(error)}`);
    } else {
      log.error(`[${tag}] ${message}`);
    }
  }
}

export const appLogger = new AppLogger();
