import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

export interface DatabaseConfig {
  host?: string;
  port: number;
  name: string;
  user?: string;
  password?: string;
  ssl: boolean;
  sslCa?: string;
  sslRejectUnauthorized: boolean;
  poolMin: number;
  poolMax: number;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  connectionString?: string;
}

export interface Config {
  port: number;
  appEnv: 'development' | 'test' | 'production';
  logLevel: string;
  corsOrigins: string[];
  databaseUrl: string;
  database: DatabaseConfig;
  rdsIdentifier: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenSecret: string;
  refreshTokenExpiresIn: string;
  storageDriver: 's3' | 'local';
  localStorageDir: string;
  awsRegion: string;
  awsS3Bucket: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
}

function parseBoolean(val: string | undefined, defaultValue = false): boolean {
  if (val === undefined || val === null || val === '') return defaultValue;
  const lower = val.toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 'require' || lower === 'verify-full' || lower === 'verify-ca';
}

function findEnvFile(filename: string): string | null {
  const candidateDirs = [
    process.cwd(),
    path.resolve(process.cwd(), 'backend'),
    path.resolve(__dirname, '../../'),
    path.resolve(__dirname, '../../../'),
    path.resolve(__dirname, '../'),
  ];

  for (const dir of candidateDirs) {
    const candidatePath = path.resolve(dir, filename);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }
  return null;
}

export const config: Config = {} as Config;

export function loadEnvironment(targetEnv?: string): string {
  // Detect CLI arguments like --env=production, --env=test, --prod
  let explicitEnv = targetEnv;
  if (!explicitEnv) {
    const envArg = process.argv.find((arg) => arg.startsWith('--env='));
    if (envArg) {
      explicitEnv = envArg.split('=')[1].trim();
    } else if (process.argv.includes('--prod')) {
      explicitEnv = 'production';
    } else if (process.argv.includes('--test')) {
      explicitEnv = 'test';
    }
  }

  const activeEnv = (explicitEnv || process.env.NODE_ENV || process.env.APP_ENV || 'development') as
    | 'development'
    | 'test'
    | 'production';

  process.env.NODE_ENV = activeEnv;
  process.env.APP_ENV = activeEnv;

  const envFilename = `.env.${activeEnv}`;
  const envFilePath = findEnvFile(envFilename);

  if (envFilePath) {
    dotenv.config({ path: envFilePath, override: false });
  } else {
    const fallbackPath = findEnvFile('.env');
    if (fallbackPath) {
      dotenv.config({ path: fallbackPath, override: false });
    }
  }

  const updatedConfig = buildConfig(activeEnv);
  Object.assign(config, updatedConfig);
  return activeEnv;
}

function findCaBundle(): string | undefined {
  const explicit =
    process.env.DATABASE_SSL_CA ||
    process.env.DATABASE_SSL_CA_PATH ||
    process.env.DB_SSL_CA ||
    process.env.PGSSLROOTCERT ||
    process.env.SSL_CERT_FILE;

  if (explicit && (fs.existsSync(explicit) || explicit.includes('BEGIN CERTIFICATE'))) {
    return explicit;
  }

  const candidateCaPaths = [
    'C:/VoiceShield/global-bundle.pem',
    'C:\\VoiceShield\\global-bundle.pem',
    '/etc/ssl/certs/global-bundle.pem',
    path.resolve(process.cwd(), 'certs/global-bundle.pem'),
    path.resolve(process.cwd(), 'backend/certs/global-bundle.pem'),
    path.resolve(__dirname, '../../certs/global-bundle.pem'),
  ];

  for (const p of candidateCaPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return explicit || undefined;
}

function resolveDatabaseConfig(): DatabaseConfig {
  const host = process.env.DATABASE_HOST || process.env.DB_HOST;
  const port = parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432', 10);
  const name = process.env.DATABASE_NAME || process.env.DB_NAME || 'voiceshield_console';
  const user = process.env.DATABASE_USER || process.env.DB_USER;
  const password = process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD;

  const rawSsl = process.env.DATABASE_SSL ?? process.env.DB_SSL;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
  const ssl = rawSsl !== undefined ? parseBoolean(rawSsl, false) : (isProduction && Boolean(host));

  const sslCa = findCaBundle();
  const rawRejectUnauth = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? process.env.DB_SSL_REJECT_UNAUTHORIZED;
  const sslRejectUnauthorized = rawRejectUnauth !== undefined ? parseBoolean(rawRejectUnauth, true) : true;

  // Render Free tier: Conservative pool size to preserve memory (512MB RAM) and RDS limits
  const poolMin = parseInt(process.env.DATABASE_POOL_MIN || process.env.DB_POOL_MIN || '2', 10);
  const poolMax = parseInt(
    process.env.DATABASE_POOL_MAX || process.env.DB_POOL_MAX || process.env.DATABASE_MAX_CONNECTIONS || '5',
    10
  );
  const connectionTimeoutMillis = parseInt(
    process.env.DATABASE_CONNECTION_TIMEOUT || process.env.DB_CONNECTION_TIMEOUT_MS || '5000',
    10
  );
  const idleTimeoutMillis = parseInt(
    process.env.DATABASE_IDLE_TIMEOUT || process.env.DB_IDLE_TIMEOUT_MS || '30000',
    10
  );

  const connectionString = process.env.DATABASE_URL || undefined;

  return {
    host,
    port,
    name,
    user,
    password,
    ssl,
    sslCa,
    sslRejectUnauthorized,
    poolMin,
    poolMax,
    connectionTimeoutMillis,
    idleTimeoutMillis,
    connectionString,
  };
}

function resolveDatabaseUrl(db: DatabaseConfig): string {
  if (db.connectionString) {
    return db.connectionString;
  }
  if (db.host && db.user) {
    const encPass = db.password ? encodeURIComponent(db.password) : '';
    const sslParam = db.ssl ? '?sslmode=require' : '';
    return `postgresql://${db.user}:${encPass}@${db.host}:${db.port}/${db.name}${sslParam}`;
  }
  return 'postgresql://voiceshield_user:voiceshield_password@localhost:5432/voiceshield_console?sslmode=disable';
}

function buildConfig(activeEnv: 'development' | 'test' | 'production'): Config {
  const resolvedDatabase = resolveDatabaseConfig();
  return {
    port: parseInt(process.env.PORT || '4000', 10),
    appEnv: activeEnv,
    logLevel: process.env.LOG_LEVEL || (activeEnv === 'production' ? 'info' : 'debug'),
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
      .split(',')
      .map((o) => o.trim()),
    databaseUrl: resolveDatabaseUrl(resolvedDatabase),
    database: resolvedDatabase,
    rdsIdentifier: process.env.RDS_IDENTIFIER || 'voiceshield-prod-db',
    jwtSecret: process.env.JWT_SECRET || 'dev-voiceshield-jwt-secret-key-32charsmin!',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenSecret:
      process.env.REFRESH_TOKEN_SECRET || 'dev-voiceshield-refresh-token-secret-key-32chars!',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    storageDriver: (process.env.STORAGE_DRIVER as any) || (activeEnv === 'production' ? 's3' : 'local'),
    localStorageDir: process.env.LOCAL_STORAGE_DIR || './storage',
    awsRegion: process.env.AWS_REGION || 'ap-south-2',
    awsS3Bucket: process.env.AWS_S3_BUCKET || 'voiceshield-evidence-production',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

// Initial eager load
loadEnvironment();

export interface DatabaseValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDatabaseConfig(
  db: DatabaseConfig = config.database,
  appEnv: string = config.appEnv
): DatabaseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Dedicated application user check (Security requirement: never run as RDS admin in production)
  const forbiddenAdminUsers = ['vs_admin', 'postgres', 'root', 'rds_admin', 'aws_admin'];
  if (db.user && forbiddenAdminUsers.includes(db.user.toLowerCase())) {
    errors.push(
      `Database user '${db.user}' is an administrative account. Production runtime MUST use a dedicated application user (e.g. voiceshield_console_app).`
    );
  }

  // Database isolation check (Ensure target database is voiceshield_console)
  if (db.name && db.name !== 'voiceshield_console' && appEnv === 'production') {
    warnings.push(
      `Target database '${db.name}' differs from canonical Console database 'voiceshield_console'.`
    );
  }

  if (appEnv === 'production') {
    if (!db.connectionString && !db.host) {
      errors.push('Production requires DATABASE_HOST or DATABASE_URL to be set.');
    }
    if (!db.connectionString && db.host) {
      if (!db.user) errors.push('Missing required environment variable: DATABASE_USER.');
      if (!db.password) errors.push('Missing required environment variable: DATABASE_PASSWORD.');
      if (!db.name) errors.push('Missing required environment variable: DATABASE_NAME.');
    }
    if (!db.ssl) {
      warnings.push('DATABASE_SSL is disabled in production. Secure TLS is recommended for AWS RDS.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
