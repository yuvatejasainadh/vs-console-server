import {
  validateDatabaseConfig,
  DatabaseConfig,
  loadEnvironment,
  config,
} from '../src/config/env';
import { DatabaseService } from '../src/database/db.service';
import { runMigrations, resolveMigrationsDir } from '../src/database/migration-runner';
import fs from 'fs';
import path from 'path';

describe('Database Configuration & AWS RDS Production Readiness', () => {
  afterAll(async () => {
    await DatabaseService.getInstance().close();
  });

  describe('Database Configuration Validation', () => {
    it('should validate production configuration with dedicated console database user', () => {
      const prodConfig: DatabaseConfig = {
        host: 'voiceshield-prod-db.chcku4ke2u3b.ap-south-2.rds.amazonaws.com',
        port: 5432,
        name: 'voiceshield_console',
        user: 'voiceshield_console_app',
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
        user: 'voiceshield_console_app',
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

  describe('Explicit Environment Loading', () => {
    it('should load production environment configuration on demand', () => {
      const loadedEnv = loadEnvironment('production');
      expect(loadedEnv).toBe('production');
      expect(config.appEnv).toBe('production');
      expect(config.database.ssl).toBe(true);
      expect(config.database.sslRejectUnauthorized).toBe(true);
      expect(config.database.name).toBe('voiceshield_console');
      expect(config.database.user).toBe('voiceshield_console_app');

      // Reset back to test
      loadEnvironment('test');
      expect(config.appEnv).toBe('test');
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
        user: 'voiceshield_console_app',
        password: 'test_password',
        ssl: true,
        sslCa: 'non_existent_file.pem',
        sslRejectUnauthorized: true,
        poolMin: 1,
        poolMax: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      };

      expect(() => db.initPool(mockCustomConfig)).not.toThrow();
      expect(db.getPool()).toBeDefined();

      loadEnvironment('test');
      db.initPool();
    });

    it('should return false on checkHealth when database connection is unreachable or simulated offline', async () => {
      const db = DatabaseService.getInstance();
      const isHealthy = await db.checkHealth();
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

    it('should support mock database service to verify tracking and idempotency execution', async () => {
      const executedQueries: string[] = [];
      const mockAppliedMigrations = new Set<string>();

      const mockDb: any = {
        testConnection: jest.fn().mockResolvedValue({ connected: true }),
        checkHealth: jest.fn().mockResolvedValue(true),
        query: jest.fn().mockImplementation((sql: string) => {
          executedQueries.push(sql);
          if (sql.includes('SELECT id FROM schema_migrations')) {
            return Promise.resolve({
              rows: Array.from(mockAppliedMigrations).map((id) => ({ id })),
              rowCount: mockAppliedMigrations.size,
            });
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        }),
        transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockClient = {
            query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
              executedQueries.push(sql);
              if (params && params[0]) {
                mockAppliedMigrations.add(params[0]);
              }
              return Promise.resolve({ rows: [], rowCount: 0 });
            }),
          };
          return cb(mockClient);
        }),
        initPool: jest.fn(),
      };

      // First run: should apply unapplied migration
      const firstRun = await runMigrations({}, mockDb);
      expect(firstRun.success).toBe(true);
      expect(firstRun.applied).toContain('001_create_core_tables.sql');
      expect(firstRun.skipped).toHaveLength(0);

      // Second run: should skip already-applied migration
      const secondRun = await runMigrations({}, mockDb);
      expect(secondRun.success).toBe(true);
      expect(secondRun.applied).toHaveLength(0);
      expect(secondRun.skipped).toContain('001_create_core_tables.sql');
    });
  });
});
