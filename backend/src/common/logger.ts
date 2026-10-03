import { config } from '../config/env';

export interface StructuredLogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  role?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  resource?: string;
  operation?: string;
  result?: string;
  details?: any;
  error?: any;
}

export class Logger {
  private static formatEntry(entry: StructuredLogEntry): string {
    return JSON.stringify({
      ...entry,
      env: config.appEnv,
    });
  }

  static info(message: string, meta: Partial<StructuredLogEntry> = {}): void {
    if (config.appEnv === 'test') return;
    const entry: StructuredLogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };
    console.log(this.formatEntry(entry));
  }

  static warn(message: string, meta: Partial<StructuredLogEntry> = {}): void {
    if (config.appEnv === 'test') return;
    const entry: StructuredLogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };
    console.warn(this.formatEntry(entry));
  }

  static error(message: string, meta: Partial<StructuredLogEntry> = {}): void {
    const entry: StructuredLogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };
    console.error(this.formatEntry(entry));
  }

  static debug(message: string, meta: Partial<StructuredLogEntry> = {}): void {
    if (config.logLevel === 'debug' && config.appEnv !== 'test') {
      const entry: StructuredLogEntry = {
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      };
      console.debug(this.formatEntry(entry));
    }
  }
}
