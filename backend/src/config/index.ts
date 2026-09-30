import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.SERVER_PORT || process.env.PORT || '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://shesecure_user:shesecure_secret_password@localhost:5432/shesecure?schema=public',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'shesecure_default_dev_jwt_secret_must_be_overridden_in_production_32_bytes',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  encryption: {
    masterKeyHex: process.env.ENCRYPTION_MASTER_KEY_HEX || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    defaultKeyId: process.env.DEFAULT_KEY_ID || 'key-v1'
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
  }
};
