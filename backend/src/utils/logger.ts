import winston from 'winston';

const sanitizeFormat = winston.format((info) => {
  const sanitized = { ...info };
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'secret', 'key', 'ciphertext', 'nonce', 'tag'];

  const deepSanitize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepSanitize);

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = deepSanitize(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return deepSanitize(sanitized);
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    sanitizeFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'shesecure-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] [${level}] [${service}]: ${message}${metaStr}`;
        })
      )
    })
  ]
});
