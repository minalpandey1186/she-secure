import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

let prisma: PrismaClient;

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
  });
} catch (err: any) {
  logger.warn('Prisma client initialization fallback for offline/test mode');
  prisma = {} as PrismaClient;
}

export { prisma };
