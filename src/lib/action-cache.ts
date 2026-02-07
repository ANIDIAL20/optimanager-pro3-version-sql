/**
 * Action Cache System
 * Intelligent caching layer for Server Actions with TTL and LRU eviction
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  accessCount: number;
  lastAccess: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxEntries?: number; // Max cache size (LRU eviction)
  storage?: 'memory' | 'session'; // Storage type
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_ENTRIES = 50;

class ActionCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
    
    // Restore from sessionStorage on client
    if (typeof window !== 'undefined') {
      this.restoreFromStorage();
    }
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check expiry
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.persistToStorage();
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();
    
    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
    // Evict LRU if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
      accessCount: 1,
      lastAccess: Date.now(),
    };

    this.cache.set(key, entry);
    this.persistToStorage();
  }

  /**
   * Remove specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.persistToStorage();
  }

  /**
   * Remove all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.persistToStorage();
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.persistToStorage();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      entries: entries.map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.expiry - Date.now(),
        accessCount: entry.accessCount,
      })),
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < lruAccess) {
        lruAccess = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Persist cache to sessionStorage
   */
  private persistToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const serialized = Array.from(this.cache.entries());
      sessionStorage.setItem('action-cache', JSON.stringify(serialized));
    } catch (error) {
      // Storage quota exceeded or unavailable, silently fail
      console.warn('Failed to persist cache to sessionStorage:', error);
    }
  }

  /**
   * Restore cache from sessionStorage
   */
  private restoreFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = sessionStorage.getItem('action-cache');
      if (!stored) return;

      const entries: [string, CacheEntry<any>][] = JSON.parse(stored);
      
      // Filter out expired entries
      const now = Date.now();
      for (const [key, entry] of entries) {
        if (entry.expiry > now) {
          this.cache.set(key, entry);
        }
      }
    } catch (error) {
      // Invalid cache, clear it
      sessionStorage.removeItem('action-cache');
    }
  }
}

// Global cache instance
const globalCache = new ActionCache();

/**
 * Get cached data
 */
export function getCachedData<T>(key: string): T | null {
  return globalCache.get<T>(key);
}

/**
 * Set cached data
 */
export function setCachedData<T>(
  key: string,
  data: T,
  ttl = DEFAULT_TTL
): void {
  globalCache.set(key, data, ttl);
}

/**
 * Invalidate cache by key
 */
export function invalidateCache(key: string): void {
  globalCache.invalidate(key);
}

/**
 * Invalidate cache by pattern
 * Example: invalidateCachePattern(/^products-/)
 */
export function invalidateCachePattern(pattern: RegExp): void {
  globalCache.invalidatePattern(pattern);
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  globalCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return globalCache.getStats();
}

/**
 * Prefetch data into cache
 */
export async function prefetchData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<void> {
  try {
    const data = await fetcher();
    setCachedData(key, data, ttl);
  } catch (error) {
    console.error(`Failed to prefetch ${key}:`, error);
  }
}
