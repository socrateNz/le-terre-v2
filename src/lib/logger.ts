type LogLevel = 'info' | 'warn' | 'error';

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaString}`;
  }

  public info(message: string, meta?: unknown): void {
    console.log(this.formatMessage('info', message, meta));
  }

  public warn(message: string, meta?: unknown): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  public error(message: string, meta?: unknown): void {
    console.error(this.formatMessage('error', message, meta));
  }
}

export const logger = new Logger();
