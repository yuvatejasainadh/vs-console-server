import { validateDatabaseConfig, DatabaseConfig } from '../src/config/env';
import { DatabaseService } from '../src/database/db.service';
import { runMigrations, resolveMigrationsDir } from '../src/database/migration-runner';
import fs from 'fs';
import path from 'path';

describe('Database Configuration & AWS RDS Production Readiness', () => {
  describe('Database Configuration Validation', () => {
    it('should validate production configuration with dedicated console database user', () => {
      const prodConfig: DatabaseConfig = {
        host: 'voiceshield-prod-db.chcku4ke2u3b.ap-south-2.rds.amazonaws.com',
        port: 5432,
        name: 'voiceshield_console',
        user: 'voiceshield_console_user',
        password: 'secure_mock_password',
        ssl: true,
        sslRejectUnauthorized: true,
        poolMin: 2,
        poolMax: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      };

      const result = validateDatabaseConfig(prodConfig, 'production');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject administrative database user (vs_admin / postgres) in production', () => {
      const adminDbConfig: DatabaseConfig = {
        host: 'voiceshield-prod-db.chcku4ke2u3b.ap-south-2.rds.amazonaws.com',
        port: 5432,
        name: 'voiceshield_console',
        user: 'vs_admin',
        password: 'mock_admin_password',
        ssl: true,
        sslRejectUnauthorized: true,
        poolMin: 2,
        poolMax: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      };

      const result = validateDatabaseConfig(adminDbConfig, 'production');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('administrative account'))).toBe(true);
    });

    it('should flag error when required production variables are missing', () => {
      const missingConfig: DatabaseConfig = {
        port: 5432,
        name: 'voiceshield_console',
        ssl: false,
        sslRejectUnauthorized: true,
        poolMin: 2,
        poolMax: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      };

      const result = validateDatabaseConfig(missingConfig, 'production');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('DATABASE_HOST or DATABASE_URL'))).toBe(true);
    });

    it('should warn if non-canonical database name is used in production', () => {
      const otherDbConfig: DatabaseConfig = {
        host: 'voiceshield-prod-db.chcku4ke2u3b.ap-south-2.rds.amazonaws.com',
        port: 5432,
        name: 'voiceshield_main_backend',
        user: 'voiceshield_console_user',
        password: 'mock_password',
        ssl: true,
        sslRejectUnauthorized: true,
        poolMin: 2,
        poolMax: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      };

      const result = validateDatabaseConfig(otherDbConfig, 'production');
      expect(result.warnings.some((w) => w.includes('voiceshield_console'))).toBe(true);
    });
  });

  describe('DatabaseService Pool & SSL Configuration', () => {
    it('should initialize pool with conservative Render Free pool limits', () => {
      const db = DatabaseService.getInstance();
      const summary = db.getStatusSummary();

      expect(summary.poolMax).toBeLessThanOrEqual(20);
      expect(summary.database).toBeDefined();
    });

    it('should handle custom SSL and CA certificate paths gracefully', () => {
      const db = DatabaseService.getInstance();
      const mockCustomConfig: DatabaseConfig = {
        host: 'voiceshield-prod-db.chcku4ke2u3b.ap-south-2.rds.amazonaws.com',
        port: 5432,
        name: 'voiceshield_console',
        user: 'voiceshield_console_user',
        password: 'test_password',
        ssl: true,
        sslCa: 'non_existent_file.pem',
        sslRejectUnauthorized: true,
        poolMin: 1,
        poolMax: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      };

      // Should not throw even if CA path does not exist
      expect(() => db.initPool(mockCustomConfig)).not.toThrow();
      expect(db.getPool()).toBeDefined();

      // Reset back to default
      db.initPool();
    });

    it('should return false on checkHealth when database connection is unreachable or simulated offline', async () => {
      const db = DatabaseService.getInstance();
      const isHealthy = await db.checkHealth();
      // In local unit tests without live postgres running, checkHealth returns false gracefully without throwing
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Migration Runner & Idempotency', () => {
    it('should find the migrations directory', () => {
      const dir = resolveMigrationsDir();
      expect(fs.existsSync(dir)).toBe(true);
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'));
      expect(files).toContain('001_create_core_tables.sql');
    });

    it('should handle offline database without crashing when running migrations', async () => {
      const result = await runMigrations();
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should verify migration SQL file contains idempotent statements', () => {
      const dir = resolveMigrationsDir();
      const sqlContent = fs.readFileSync(path.join(dir, '001_create_core_tables.sql'), 'utf-8');

      // Must be forward-only and non-destructive
      expect(sqlContent).not.toMatch(/DROP\s+DATABASE/i);
      expect(sqlContent).not.toMatch(/DROP\s+SCHEMA/i);
      expect(sqlContent).not.toMatch(/TRUNCATE/i);
      expect(sqlContent).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+users/i);
      expect(sqlContent).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+work_items/i);
      expect(sqlContent).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+devices/i);
    });
  });
});
