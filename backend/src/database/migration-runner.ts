import fs from 'fs';
import path from 'path';
import { DatabaseService } from './db.service';
import { Logger } from '../common/logger';
import { config, loadEnvironment, validateDatabaseConfig } from '../config/env';

export interface MigrationOptions {
  env?: string;
  migrationsDir?: string;
}

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
  options: MigrationOptions = {},
  db: DatabaseService = DatabaseService.getInstance()
): Promise<MigrationExecutionResult> {
  // 1. Explicitly load environment if specified via options or CLI flags
  if (options.env || process.argv.includes('--env=production') || process.argv.includes('--prod')) {
    const targetEnv = options.env || 'production';
    loadEnvironment(targetEnv);
    db.initPool(); // Reinitialize pool with refreshed environment config
  }

  const migrationsDir = options.migrationsDir || resolveMigrationsDir();
  const applied: string[] = [];
  const skipped: string[] = [];

  Logger.info(`Starting PostgreSQL schema migration check for database '${config.database.name}'...`, {
    resource: 'DATABASE_MIGRATION',
    details: {
      env: config.appEnv,
      host: config.database.host || 'url_configured',
      database: config.database.name,
      user: config.database.user,
      ssl: config.database.ssl,
      sslCaPath: config.database.sslCa ? 'Configured/Loaded' : 'None',
      rejectUnauthorized: config.database.sslRejectUnauthorized,
      migrationsDir,
    },
  });

  // 2. Validate database configuration
  const validation = validateDatabaseConfig(config.database, config.appEnv);
  if (validation.warnings.length > 0) {
    validation.warnings.forEach((w) =>
      Logger.warn(`Migration config warning: ${w}`, { resource: 'DATABASE_MIGRATION' })
    );
  }

  if (!validation.valid) {
    const errorMsg = `Database configuration validation failed: ${validation.errors.join('; ')}`;
    Logger.error(errorMsg, {
      resource: 'DATABASE_MIGRATION',
      error: errorMsg,
      details: { errors: validation.errors },
    });
    return { success: false, applied, skipped, error: errorMsg };
  }

  try {
    // 3. Verify PostgreSQL database connectivity with detailed error capture
    const connTest = await db.testConnection();
    if (!connTest.connected) {
      const err = connTest.error;
      const errorMsg = `Failed to connect to PostgreSQL database '${config.database.name}' at '${
        config.database.host || 'url_configured'
      }:${config.database.port}'. [${err?.code || err?.name || 'CONNECTION_ERROR'}] ${err?.message}${
        err?.detail ? ` - Detail: ${err.detail}` : ''
      }`;

      Logger.error(errorMsg, {
        resource: 'DATABASE_MIGRATION',
        error: err?.message || 'Connection failed',
        details: {
          code: err?.code,
          name: err?.name,
          severity: err?.severity,
          host: config.database.host,
          port: config.database.port,
          database: config.database.name,
          user: config.database.user,
          ssl: config.database.ssl,
          sslCa: config.database.sslCa ? 'Loaded' : 'Not Loaded',
        },
      });
      return { success: false, applied, skipped, error: errorMsg };
    }

    // 4. Ensure migration tracking table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Fetch already applied migrations
    const existingResult = await db.query<{ id: string }>('SELECT id FROM schema_migrations;');
    const appliedSet = new Set<string>(existingResult.rows.map((r) => r.id));

    // 6. Read migration files sorted in alphabetical/chronological order
    if (!fs.existsSync(migrationsDir)) {
      const errorMsg = `Migrations directory not found at: ${migrationsDir}`;
      Logger.error(errorMsg, { resource: 'DATABASE_MIGRATION', error: errorMsg });
      return { success: false, applied, skipped, error: errorMsg };
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

    if (applied.length === 0) {
      Logger.info(
        `All migrations are up to date (${skipped.length} applied previously, 0 pending).`,
        {
          resource: 'DATABASE_MIGRATION',
          details: { totalTracked: skipped.length },
        }
      );
    } else {
      Logger.info(
        `Migrations run completed successfully. Applied: ${applied.length}, Previously applied: ${skipped.length}`,
        {
          resource: 'DATABASE_MIGRATION',
          details: { appliedCount: applied.length, skippedCount: skipped.length },
        }
      );
    }

    return { success: true, applied, skipped };
  } catch (err: any) {
    const errorMsg = `Error executing migrations on '${config.database.name}': ${err.message}`;
    Logger.error(errorMsg, {
      resource: 'DATABASE_MIGRATION',
      error: err.message,
      details: { stack: err.stack },
    });
    return { success: false, applied, skipped, error: errorMsg };
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
