import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';

let redis: Redis | null = null;

if (env.enableRedisCache) {
  redis = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  redis.on('error', (error) => {
    logger.warn({ err: error }, 'Redis cache unavailable, fallback to non-cached mode');
  });

  redis.connect().catch((error) => {
    logger.warn({ err: error }, 'Redis connect failed, caching disabled');
  });
}

export const cacheClient = redis;
