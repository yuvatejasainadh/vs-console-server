import fs from 'fs';
import path from 'path';
import { DatabaseService } from './db.service';
import { Logger } from '../common/logger';
import { config } from '../config/env';

export interface MigrationExecutionResult {
  success: boolean;
  applied: string[];
  skipped: string[];
  error?: string;
}

export function resolveMigrationsDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../migrations'),
    path.resolve(__dirname, '../migrations'),
    path.resolve(process.cwd(), 'migrations'),
    path.resolve(process.cwd(), 'backend/migrations'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), 'migrations');
}

export async function runMigrations(
  db: DatabaseService = DatabaseService.getInstance()
): Promise<MigrationExecutionResult> {
  const migrationsDir = resolveMigrationsDir();
  Logger.info(`Starting PostgreSQL schema migration check for database '${config.database.name}'...`, {
    resource: 'DATABASE_MIGRATION',
    details: {
      host: config.database.host || 'url_configured',
      database: config.database.name,
      ssl: config.database.ssl,
      migrationsDir,
    },
  });

  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    const isConnected = await db.checkHealth();
    if (!isConnected) {
      const msg = 'PostgreSQL database not currently reachable. Skipping live SQL execution.';
      Logger.warn(msg, { resource: 'DATABASE_MIGRATION' });
      return { success: false, applied, skipped, error: msg };
    }

    // 1. Ensure migration tracking table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const existingResult = await db.query<{ id: string }>('SELECT id FROM schema_migrations;');
    const appliedSet = new Set<string>(existingResult.rows.map((r) => r.id));

    // 3. Read migration files sorted in order
    if (!fs.existsSync(migrationsDir)) {
      Logger.warn(`Migrations directory not found at: ${migrationsDir}`, {
        resource: 'DATABASE_MIGRATION',
      });
      return { success: true, applied, skipped };
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        Logger.info(`Migration already recorded in schema_migrations, skipping: ${file}`, {
          resource: 'DATABASE_MIGRATION',
          details: { file },
        });
        skipped.push(file);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      Logger.info(`Executing migration transaction: ${file}`, {
        resource: 'DATABASE_MIGRATION',
        details: { file },
      });
      await db.transaction(async (client) => {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      });

      Logger.info(`Successfully executed and tracked migration: ${file}`, {
        resource: 'DATABASE_MIGRATION',
        details: { file },
      });
      applied.push(file);
    }

    Logger.info(
      `Migrations run completed. Applied: ${applied.length}, Skipped (Already applied): ${skipped.length}`,
      {
        resource: 'DATABASE_MIGRATION',
        details: { appliedCount: applied.length, skippedCount: skipped.length },
      }
    );
    return { success: true, applied, skipped };
  } catch (err: any) {
    Logger.error('Error running migrations', {
      resource: 'DATABASE_MIGRATION',
      error: err.message,
      details: { stack: err.stack },
    });
    return { success: false, applied, skipped, error: err.message };
  }
}

if (require.main === module) {
  runMigrations()
    .then((result) => {
      if (!result.success) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      Logger.error('Fatal error during migration execution', {
        resource: 'DATABASE_MIGRATION',
        error: err.message,
      });
      process.exit(1);
    });
}
