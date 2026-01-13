import { Redis } from '@upstash/redis';

// Initialize Redis client
// Fallback to warning log if env vars are missing (for dev environment without redis)
const getRedisClient = () => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('⚠️ Redis env vars missing. Cache will be disabled.');
    return null;
  }

  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
};

export const redis = getRedisClient();

export const CACHE_TTL = {
  SHORT: 300,       // 5 minutes
  MEDIUM: 1800,     // 30 minutes
  LONG: 3600,       // 1 hour
  VERY_LONG: 86400, // 24 hours
};

export const CACHE_TAGS = {
  clients: (userId: string) => `clients:${userId}`,
  client: (id: string) => `client:${id}`,
  products: (userId: string) => `products:${userId}`,
  product: (id: string) => `product:${id}`,
  sales: (userId: string) => `sales:${userId}`,
  sale: (id: string) => `sale:${id}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
};
