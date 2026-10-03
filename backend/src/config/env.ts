import dotenv from 'dotenv';
import path from 'path';

const env = process.env.NODE_ENV || process.env.APP_ENV || 'development';

if (env === 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
} else if (env === 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
  dotenv.config(); // fallback to .env
}

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

function resolveDatabaseConfig(): DatabaseConfig {
  const host = process.env.DATABASE_HOST || process.env.DB_HOST;
  const port = parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432', 10);
  const name = process.env.DATABASE_NAME || process.env.DB_NAME || 'voiceshield_console';
  const user = process.env.DATABASE_USER || process.env.DB_USER;
  const password = process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD;

  const rawSsl = process.env.DATABASE_SSL ?? process.env.DB_SSL;
  const isProduction = (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production');
  const ssl = rawSsl !== undefined ? parseBoolean(rawSsl, false) : (isProduction && Boolean(host));

  const sslCa = process.env.DATABASE_SSL_CA || process.env.DATABASE_SSL_CA_PATH || process.env.DB_SSL_CA;
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

const resolvedDatabase = resolveDatabaseConfig();

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

export const config: Config = {
  port: parseInt(process.env.PORT || '4000', 10),
  appEnv: (process.env.APP_ENV as any) || (process.env.NODE_ENV as any) || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
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
  storageDriver: (process.env.STORAGE_DRIVER as any) || 'local',
  localStorageDir: process.env.LOCAL_STORAGE_DIR || './storage',
  awsRegion: process.env.AWS_REGION || 'ap-south-2',
  awsS3Bucket: process.env.AWS_S3_BUCKET || 'voiceshield-evidence-production',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

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
      `Database user '${db.user}' is an administrative account. Production runtime MUST use a dedicated application user (e.g. voiceshield_console_user).`
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
