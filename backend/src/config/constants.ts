export const APP_NAME = 'VoiceShield Console';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const PASSWORD_SALT_ROUNDS =
  process.env.NODE_ENV === 'test' || process.env.APP_ENV === 'test' ? 4 : 12;

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
  'application/octet-stream',
];
