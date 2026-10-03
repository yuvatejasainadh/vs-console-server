import { createApp } from './app';
import { config, validateDatabaseConfig } from './config/env';
import { Logger } from './common/logger';
import { DatabaseService } from './database/db.service';
import { seedDevelopmentData } from './database/seed';

async function bootstrap() {
  Logger.info(`Starting VoiceShield Console Backend [${config.appEnv}]...`);

  // Validate database configuration (logs warnings/errors for operator awareness)
  const validation = validateDatabaseConfig();
  if (validation.warnings.length > 0) {
    validation.warnings.forEach((w) => Logger.warn(`Configuration warning: ${w}`));
  }
  if (!validation.valid) {
    validation.errors.forEach((e) => Logger.error(`Configuration issue: ${e}`));
  }

  // Seed development data in-memory / state
  await seedDevelopmentData();

  const app = createApp();
  const dbService = DatabaseService.getInstance();

  // Non-blocking database connectivity check
  dbService
    .checkHealth()
    .then((connected) => {
      if (connected) {
        Logger.info('PostgreSQL RDS connection established successfully', {
          resource: 'DATABASE_RDS',
          details: {
            host: config.database.host || 'url_configured',
            database: config.database.name,
            ssl: config.database.ssl,
          },
        });
      } else {
        Logger.info('PostgreSQL RDS connection check: currently idle/standby', {
          resource: 'DATABASE_RDS',
          details: {
            database: config.database.name,
          },
        });
      }
    })
    .catch((err) => {
      Logger.warn(`PostgreSQL RDS startup check note: ${err?.message}`, {
        resource: 'DATABASE_RDS',
      });
    });

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
  Logger.error('Fatal bootstrap error', {
    error: err?.message,
    details: { stack: err?.stack },
  });
  process.exit(1);
});
