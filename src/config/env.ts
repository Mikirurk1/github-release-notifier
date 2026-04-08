import dotenv from 'dotenv';

dotenv.config();

const parseBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: parseNumber(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  githubToken: process.env.GITHUB_TOKEN,
  githubApiBaseUrl: process.env.GITHUB_API_BASE_URL || 'https://api.github.com',
  scannerIntervalMs: parseNumber(process.env.SCANNER_INTERVAL_MS, 300000),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseNumber(process.env.SMTP_PORT, 587),
  smtpSecure: parseBool(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'noreply@example.com',
  apiKey: process.env.API_KEY,
  enableRedisCache: parseBool(process.env.ENABLE_REDIS_CACHE, false),
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  githubCacheTtlSec: parseNumber(process.env.GITHUB_CACHE_TTL_SEC, 600),
};

export const validateEnv = (): void => {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASS are required');
  }

  if (!Number.isInteger(env.port) || env.port <= 0 || env.port > 65535) {
    throw new Error('PORT must be a valid TCP port between 1 and 65535');
  }

  if (!Number.isInteger(env.smtpPort) || env.smtpPort <= 0 || env.smtpPort > 65535) {
    throw new Error('SMTP_PORT must be a valid TCP port between 1 and 65535');
  }

  if (!Number.isInteger(env.scannerIntervalMs) || env.scannerIntervalMs < 5000) {
    throw new Error('SCANNER_INTERVAL_MS must be an integer >= 5000');
  }

  if (!Number.isInteger(env.githubCacheTtlSec) || env.githubCacheTtlSec < 0) {
    throw new Error('GITHUB_CACHE_TTL_SEC must be a non-negative integer');
  }
};
