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

export interface Config {
  port: number;
  appEnv: 'development' | 'test' | 'production';
  logLevel: string;
  corsOrigins: string[];
  databaseUrl: string;
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

export const config: Config = {
  port: parseInt(process.env.PORT || '4000', 10),
  appEnv: (process.env.APP_ENV as any) || (process.env.NODE_ENV as any) || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://voiceshield_user:voiceshield_password@localhost:5432/voiceshield_console?sslmode=disable',
  rdsIdentifier: process.env.RDS_IDENTIFIER || 'voiceshield-dev-rds',
  jwtSecret: process.env.JWT_SECRET || 'dev-voiceshield-jwt-secret-key-32charsmin!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenSecret:
    process.env.REFRESH_TOKEN_SECRET || 'dev-voiceshield-refresh-token-secret-key-32chars!',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  storageDriver: (process.env.STORAGE_DRIVER as any) || 'local',
  localStorageDir: process.env.LOCAL_STORAGE_DIR || './storage',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsS3Bucket: process.env.AWS_S3_BUCKET || 'voiceshield-evidence-production',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};
