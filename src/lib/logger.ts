export const SENSITIVE_KEYS = ['password', 'token', 'apikey', 'api_key', 'authorization', 'geminikey', 'metaaihistory'];

function redactObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item));
  }
  
  const redacted: any = {};
  for (const key in obj) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      redacted[key] = '***REDACTED***';
    } else {
      redacted[key] = redactObject(obj[key]);
    }
  }
  return redacted;
}

interface LogPayload {
  correlationId?: string;
  [key: string]: any;
}

class Logger {
  private formatMessage(level: string, message: string, payload?: LogPayload) {
    const timestamp = new Date().toISOString();
    const redactedPayload = payload ? redactObject(payload) : undefined;
    
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(redactedPayload || {})
    });
  }

  info(message: string, payload?: LogPayload) {
    console.log(this.formatMessage('INFO', message, payload));
  }

  warn(message: string, payload?: LogPayload) {
    console.warn(this.formatMessage('WARN', message, payload));
  }

  error(message: string, payload?: LogPayload) {
    console.error(this.formatMessage('ERROR', message, payload));
  }
}

export const logger = new Logger();
