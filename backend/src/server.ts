import { app } from './app';
import { config } from './config';
import { authService } from './services/authentication/auth.service';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    // Seed default authority users if database is fresh
    await authService.seedDefaultAuthorities();

    const server = app.listen(config.port, () => {
      logger.info(`===================================================`);
      logger.info(`🛡️  SHESECURE BACKEND SERVER RUNNING ON PORT ${config.port}`);
      logger.info(`🛡️  Environment: ${config.env}`);
      logger.info(`🛡️  Telegram Integration: ${config.telegram.enabled ? 'ACTIVE' : 'SIMULATION MODE'}`);
      logger.info(`🛡️  Health: http://localhost:${config.port}/api/v1/health`);
      logger.info(`===================================================`);
    });

    // Graceful Shutdown
    const shutdown = () => {
      logger.info('Received termination signal. Gracefully closing HTTP server...');
      server.close(() => {
        logger.info('Server closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err: any) {
    logger.error('Fatal error during backend server startup', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

bootstrap();
