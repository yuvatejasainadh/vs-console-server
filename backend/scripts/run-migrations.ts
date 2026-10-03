import { runMigrations, MigrationExecutionResult } from '../src/database/migration-runner';
import { Logger } from '../src/common/logger';

export { runMigrations, MigrationExecutionResult };

if (require.main === module) {
  runMigrations()
    .then((result) => {
      if (!result.success) {
        Logger.error(`Migration script failed: ${result.error}`, {
          resource: 'DATABASE_MIGRATION',
          error: result.error,
        });
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      Logger.error('Fatal migration execution error', { error: err?.message });
      process.exit(1);
    });
}
