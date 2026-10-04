import { config, loadEnvironment, validateDatabaseConfig } from '../src/config/env';
import { DatabaseService } from '../src/database/db.service';
import { DataStore, UserEntity } from '../src/database/data-store';
import { UserRole } from '../src/roles/roles.enum';
import { Logger } from '../src/common/logger';
import { v4 as uuidv4 } from 'uuid';

export const SUPER_ADMIN_EMAIL = 'sainadh@voiceshield.ai';
export const SUPER_ADMIN_DISPLAY_NAME = 'Sainadh';
export const SUPER_ADMIN_ROLE = UserRole.SUPER_ADMIN;
export const SUPER_ADMIN_STATUS = 'ACTIVE';

// Authoritative pre-computed bcrypt hash (cost factor 12)
export const SUPER_ADMIN_PASSWORD_HASH =
  '$2a$12$rndt2CcnDURye4ndX6rWquhnDJ6a/thMWaoOOXD4u/Q7bMQApkwm6';

export interface SeedResult {
  success: boolean;
  action: 'CREATED' | 'UPDATED';
  target: 'POSTGRES_RDS' | 'DATA_STORE';
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Idempotently seed the production Super Admin account.
 * Uses atomic PostgreSQL transactions against RDS and synchronizes DataStore.
 */
export async function seedProductionSuperAdmin(options?: {
  confirm?: boolean;
  env?: string;
  silent?: boolean;
}): Promise<SeedResult> {
  const targetEnv =
    options?.env ||
    (process.argv.includes('--env=production') || process.argv.includes('--prod')
      ? 'production'
      : undefined);
  const activeEnv = loadEnvironment(targetEnv);
  const isProduction = activeEnv === 'production' || config.appEnv === 'production';

  // Ensure DatabaseService pool is initialized with loaded configuration
  DatabaseService.getInstance().initPool();

  const isConfirmed =
    options?.confirm ??
    (process.env.SEED_CONFIRM === 'true' || process.argv.includes('--confirm'));

  if (isProduction && !isConfirmed) {
    const errorMsg =
      'Production database seeding requires explicit confirmation.\n' +
      'Please re-run with: SEED_CONFIRM=true npm run seed:super-admin:prod\n' +
      'Or in PowerShell: $env:SEED_CONFIRM="true"; npm run seed:super-admin:prod';
    if (!options?.silent) {
      Logger.error(errorMsg);
    }
    throw new Error('SEED_CONFIRMATION_REQUIRED');
  }

  if (!options?.silent) {
    Logger.info('==================================================');
    Logger.info('VoiceShield Console — Production Super Admin Seed');
    Logger.info('==================================================');
    Logger.info(`Target environment: ${activeEnv}`);
    Logger.info(`Target database:    ${config.database.name}`);
    Logger.info(`Target host:        ${config.database.host || 'url_configured'}`);
    Logger.info(`Seed user:          ${SUPER_ADMIN_EMAIL}`);
    Logger.info(`Role:               ${SUPER_ADMIN_ROLE}`);
    Logger.info(`Status:             ${SUPER_ADMIN_STATUS}`);
  }

  // Validate database configuration
  const validation = validateDatabaseConfig();
  if (!validation.valid && isProduction) {
    validation.errors.forEach((e) => Logger.error(`Database configuration issue: ${e}`));
  }

  const dbService = DatabaseService.getInstance();
  const dbTest = await dbService.testConnection();

  let seedResult: SeedResult;

  if (dbTest.connected) {
    if (!options?.silent) {
      Logger.info('PostgreSQL RDS connection verified. Executing atomic seed transaction...');
    }

    seedResult = await dbService.transaction(async (client) => {
      // 1. Check if user already exists
      const checkRes = await client.query(
        'SELECT id, email, display_name, role, status, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)',
        [SUPER_ADMIN_EMAIL]
      );

      let action: 'CREATED' | 'UPDATED' = 'CREATED';
      let userRow: any;

      if (checkRes.rows.length > 0) {
        action = 'UPDATED';
        const updateRes = await client.query(
          `UPDATE users 
           SET role = $1, status = $2, password_hash = $3, display_name = $4, updated_at = NOW() 
           WHERE LOWER(email) = LOWER($5) 
           RETURNING id, email, display_name, role, status, created_at, updated_at`,
          [
            SUPER_ADMIN_ROLE,
            SUPER_ADMIN_STATUS,
            SUPER_ADMIN_PASSWORD_HASH,
            SUPER_ADMIN_DISPLAY_NAME,
            SUPER_ADMIN_EMAIL,
          ]
        );
        userRow = updateRes.rows[0];
      } else {
        action = 'CREATED';
        const insertRes = await client.query(
          `INSERT INTO users (id, email, password_hash, display_name, role, status, created_at, updated_at) 
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()) 
           RETURNING id, email, display_name, role, status, created_at, updated_at`,
          [
            SUPER_ADMIN_EMAIL,
            SUPER_ADMIN_PASSWORD_HASH,
            SUPER_ADMIN_DISPLAY_NAME,
            SUPER_ADMIN_ROLE,
            SUPER_ADMIN_STATUS,
          ]
        );
        userRow = insertRes.rows[0];
      }

      return {
        success: true,
        action,
        target: 'POSTGRES_RDS' as const,
        user: {
          id: userRow.id,
          email: userRow.email,
          displayName: userRow.display_name,
          role: userRow.role,
          status: userRow.status,
          createdAt: new Date(userRow.created_at).toISOString(),
          updatedAt: new Date(userRow.updated_at).toISOString(),
        },
      };
    });
  } else {
    if (!options?.silent) {
      Logger.warn(
        `PostgreSQL not reachable (${dbTest.error?.message || 'offline'}). Seeding into in-memory DataStore.`
      );
    }

    const store = DataStore.getInstance();
    const existing = Array.from(store.users.values()).find(
      (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );

    const now = new Date().toISOString();
    let action: 'CREATED' | 'UPDATED' = 'CREATED';
    let userEntity: UserEntity;

    if (existing) {
      action = 'UPDATED';
      existing.role = SUPER_ADMIN_ROLE;
      existing.status = SUPER_ADMIN_STATUS;
      existing.password_hash = SUPER_ADMIN_PASSWORD_HASH;
      existing.display_name = SUPER_ADMIN_DISPLAY_NAME;
      existing.updated_at = now;
      userEntity = existing;
    } else {
      action = 'CREATED';
      userEntity = {
        id: uuidv4(),
        email: SUPER_ADMIN_EMAIL,
        password_hash: SUPER_ADMIN_PASSWORD_HASH,
        display_name: SUPER_ADMIN_DISPLAY_NAME,
        role: SUPER_ADMIN_ROLE,
        status: SUPER_ADMIN_STATUS,
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: null,
        created_at: now,
        updated_at: now,
      };
      store.users.set(userEntity.id, userEntity);
    }

    seedResult = {
      success: true,
      action,
      target: 'DATA_STORE' as const,
      user: {
        id: userEntity.id,
        email: userEntity.email,
        displayName: userEntity.display_name,
        role: userEntity.role,
        status: userEntity.status,
        createdAt: userEntity.created_at,
        updatedAt: userEntity.updated_at,
      },
    };
  }

  // Synchronize in-memory DataStore instance for process lifetime
  const store = DataStore.getInstance();
  const existingInStore = Array.from(store.users.values()).find(
    (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
  );
  if (existingInStore) {
    existingInStore.role = SUPER_ADMIN_ROLE;
    existingInStore.status = SUPER_ADMIN_STATUS;
    existingInStore.password_hash = SUPER_ADMIN_PASSWORD_HASH;
    existingInStore.display_name = SUPER_ADMIN_DISPLAY_NAME;
    existingInStore.updated_at = seedResult.user.updatedAt;
  } else {
    store.users.set(seedResult.user.id, {
      id: seedResult.user.id,
      email: seedResult.user.email,
      password_hash: SUPER_ADMIN_PASSWORD_HASH,
      display_name: seedResult.user.displayName,
      role: seedResult.user.role as UserRole,
      status: seedResult.user.status as 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: null,
      created_at: seedResult.user.createdAt,
      updated_at: seedResult.user.updatedAt,
    });
  }

  if (!options?.silent) {
    Logger.info('==================================================');
    Logger.info(`Super Admin Seed Result: ${seedResult.action} (${seedResult.target})`);
    Logger.info(`User ID:      ${seedResult.user.id}`);
    Logger.info(`Email:        ${seedResult.user.email}`);
    Logger.info(`Display Name: ${seedResult.user.displayName}`);
    Logger.info(`Role:         ${seedResult.user.role}`);
    Logger.info(`Status:       ${seedResult.user.status}`);
    Logger.info(`Created At:   ${seedResult.user.createdAt}`);
    Logger.info('==================================================');
  }

  return seedResult;
}

if (require.main === module) {
  seedProductionSuperAdmin()
    .then(async () => {
      await DatabaseService.getInstance().close();
      process.exit(0);
    })
    .catch(async (err) => {
      if (err.message !== 'SEED_CONFIRMATION_REQUIRED') {
        Logger.error(`Seed execution failed: ${err.message}`);
      }
      await DatabaseService.getInstance().close();
      process.exit(1);
    });
}
