import { createApp } from './app';
import { config } from './config/env';
import { Logger } from './common/logger';
import { DatabaseService } from './database/db.service';
import { seedDevelopmentData } from './database/seed';

async function bootstrap() {
  Logger.info(`Starting VoiceShield Console Backend [${config.appEnv}]...`);

  // Seed development data in-memory / state
  await seedDevelopmentData();

  const app = createApp();
  const dbService = DatabaseService.getInstance();

  const server = app.listen(config.port, () => {
    Logger.info(`VoiceShield Console Backend running at http://localhost:${config.port}`);
    Logger.info(`OpenAPI Documentation: http://localhost:${config.port}/api/docs`);
    Logger.info(`Health check: http://localhost:${config.port}/health`);
  });

  // Graceful shutdown handling
  const handleShutdown = async (signal: string) => {
    Logger.info(`Received ${signal}. Gracefully shutting down VoiceShield Console...`);
    server.close(async () => {
      Logger.info('HTTP server closed.');
      await dbService.close();
      Logger.info('Database connections closed. Shutdown complete.');
      process.exit(0);
    });

    // Force close after 10s if graceful shutdown hangs
    setTimeout(() => {
      Logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  Logger.error('Fatal bootstrap error', { error: err?.message, details: err?.stack });
  process.exit(1);
});
