/**
 * @fileoverview Cache Service for storing API responses with TTL.
 * Uses localStorage for persistence across sessions.
 */

/**
 * Cache entry with data and expiration
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  cachedAt: number;
}

/**
 * Default TTL values for different data types (in milliseconds)
 */
export const CACHE_TTL = {
  /** User profile data - 10 minutes */
  USER_PROFILE: 10 * 60 * 1000,
  /** Repository stats - 5 minutes */
  REPO_STATS: 5 * 60 * 1000,
  /** Branch list - 30 minutes */
  BRANCHES: 30 * 60 * 1000,
  /** PR search results - 5 minutes */
  PR_SEARCH: 5 * 60 * 1000,
  /** Generic API response - 5 minutes */
  DEFAULT: 5 * 60 * 1000,
};

/**
 * Cache Service - Manages cached API responses in localStorage
 */
export class CacheService {
  private static readonly CACHE_PREFIX = "gsoc_cache_";
  private static readonly VERSION = "v1";

  /**
   * Generate a cache key from components
   */
  static generateKey(...parts: string[]): string {
    return `${this.CACHE_PREFIX}${this.VERSION}_${parts.join("_")}`;
  }

  /**
   * Get data from cache
   * @returns Cached data or null if expired/missing
   */
  static get<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check expiration
      if (Date.now() > entry.expiresAt) {
        this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn("Cache read error:", error);
      return null;
    }
  }

  /**
   * Store data in cache with TTL
   */
  static set<T>(key: string, data: T, ttl: number = CACHE_TTL.DEFAULT): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        cachedAt: Date.now(),
        expiresAt: Date.now() + ttl,
      };

      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      // localStorage might be full or disabled
      console.warn("Cache write error:", error);
      this.cleanup();
    }
  }

  /**
   * Remove a specific cache entry
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Cache remove error:", error);
    }
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("Cache clear error:", error);
    }
  }

  /**
   * Remove expired entries
   */
  static cleanup(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();

      keys.forEach((key) => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const entry = JSON.parse(stored);
              if (now > entry.expiresAt) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // Invalid entry, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn("Cache cleanup error:", error);
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): { count: number; size: number; entries: string[] } {
    const entries: string[] = [];
    let size = 0;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          entries.push(key.replace(this.CACHE_PREFIX + this.VERSION + "_", ""));
          const stored = localStorage.getItem(key);
          if (stored) {
            size += stored.length * 2; // UTF-16 characters
          }
        }
      });
    } catch (error) {
      console.warn("Cache stats error:", error);
    }

    return { count: entries.length, size, entries };
  }

  /**
   * Check if a cache entry exists and is valid
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get data from cache or fetch it
   */
  static async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.DEFAULT
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      console.log(`[Cache HIT] ${key}`);
      return cached;
    }

    console.log(`[Cache MISS] ${key}`);
    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }
}
