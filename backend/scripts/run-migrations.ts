import fs from 'fs';
import path from 'path';
import { DatabaseService } from '../src/database/db.service';
import { Logger } from '../src/common/logger';

export async function runMigrations(): Promise<void> {
  const db = DatabaseService.getInstance();
  const migrationsDir = path.resolve(__dirname, '../migrations');

  Logger.info('Starting PostgreSQL schema migration check...');

  try {
    const isConnected = await db.checkHealth();
    if (!isConnected) {
      Logger.warn('PostgreSQL database not currently reachable. Skipping live SQL execution.');
      return;
    }

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      Logger.info(`Executing migration: ${file}`);
      await db.query(sql);
      Logger.info(`Successfully executed migration: ${file}`);
    }

    Logger.info('All migrations completed successfully.');
  } catch (err: any) {
    Logger.error('Error running migrations', { error: err.message });
  }
}

if (require.main === module) {
  runMigrations().then(() => {
    process.exit(0);
  });
}
