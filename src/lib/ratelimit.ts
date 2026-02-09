import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./cache/redis";

// Only initialize if Redis is available
const ratelimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
      analytics: true,
      prefix: "@upstash/ratelimit/admin",
    })
  : null;

/**
 * Check rate limit for a given identifier (IP or User ID)
 * Returns { success, limit, remaining, reset }
 */
export async function checkRateLimit(identifier: string) {
  if (!ratelimit) {
    // If Redis is not configured, we allow the request but log a warning
    // In production, Redis must be configured.
    return { success: true, remaining: 999, reset: Date.now() };
  }

  const result = await ratelimit.limit(identifier);
  
  if (!result.success) {
    console.warn(`⚠️ [RATE LIMIT] Exceeded for identifier: ${identifier}`);
  }

  return result;
}
