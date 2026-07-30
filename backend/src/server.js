import 'dotenv/config';

import app from './app.js';
import prisma from './config/db.js';
import { describeMailConfig } from './services/mailService.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('server');
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  const mailConfig = describeMailConfig();

  logger.info('Server started', { port: PORT, env: process.env.NODE_ENV });

  if (mailConfig.ready) {
    logger.info('Email is configured', { sender: mailConfig.sender });
  } else {
    logger.warn('Email is NOT configured — sharing will work without emails', {
      apiKeyPresent: mailConfig.apiKeyPresent,
      apiKeyLength: mailConfig.apiKeyLength,
      sender: mailConfig.sender,
    });
  }
});

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
