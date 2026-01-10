import Redis from "ioredis";
import { config } from "../../config/AppConfig.js";
import { ICacheService } from "../../core/interfaces/index.js";
import { Logger } from "../../shared/utils/Logger.js";

/**
 * Redis cache service implementation with in-memory fallback
 * Implements ICacheService interface for dependency inversion
 * @class RedisCacheService
 * @implements {ICacheService}
 */
export class RedisCacheService implements ICacheService {
  private static instance: RedisCacheService;
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private memoryCache: Map<string, { value: string; expiry: number }> =
    new Map();
  private useMemoryFallback: boolean = false;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with fallback
   */
  private initializeRedis(): void {
    try {
      this.client = new Redis({
        host: config.redisHost,
        port: config.redisPort,
        password: config.redisPassword || undefined,
        retryStrategy: (times: number) => {
          if (times >= 3) {
            Logger.warn(
              "Redis connection failed after 3 attempts, using memory fallback"
            );
            this.useMemoryFallback = true;
            return null; // Stop retrying
          }
          return Math.min(times * 100, 1000);
        },
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true,
      });

      this.setupEventHandlers();

      // Try to connect, but don't block
      this.client.connect().catch(() => {
        Logger.warn("Redis not available, using in-memory cache");
        this.useMemoryFallback = true;
      });
    } catch {
      Logger.warn("Redis initialization failed, using in-memory cache");
      this.useMemoryFallback = true;
    }
  }

  /**
   * Get singleton instance
   * @returns {RedisCacheService}
   */
  public static getInstance(): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService();
    }
    return RedisCacheService.instance;
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on("connect", () => {
      Logger.info("Redis connected");
      this.isConnected = true;
      this.useMemoryFallback = false;
    });

    this.client.on("error", () => {
      this.isConnected = false;
      this.useMemoryFallback = true;
    });

    this.client.on("close", () => {
      this.isConnected = false;
    });
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<T | null>} Cached value or null
   */
  public async get<T>(key: string): Promise<T | null> {
    if (this.useMemoryFallback) {
      return this.memoryGet<T>(key);
    }

    try {
      const value = await this.client!.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch {
      return this.memoryGet<T>(key);
    }
  }

  /**
   * Get from memory cache
   */
  private memoryGet<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {T} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<void>}
   */
  public async set<T>(key: string, value: T, ttl: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.useMemoryFallback) {
      this.memoryCache.set(key, {
        value: serialized,
        expiry: Date.now() + ttl * 1000,
      });
      return;
    }

    try {
      await this.client!.setex(key, ttl, serialized);
    } catch {
      this.memoryCache.set(key, {
        value: serialized,
        expiry: Date.now() + ttl * 1000,
      });
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  public async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (!this.useMemoryFallback && this.client) {
      try {
        await this.client.del(key);
      } catch {
        // Ignore Redis errors
      }
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  public async exists(key: string): Promise<boolean> {
    if (this.useMemoryFallback) {
      const entry = this.memoryCache.get(key);
      return entry !== undefined && Date.now() <= entry.expiry;
    }

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  }

  /**
   * Get or fetch data - returns cached value or fetches and caches
   * Pattern: Read-through cache
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if cache miss
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<T>} Cached or fetched value
   */
  public async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      Logger.debug(`Cache hit for key: ${key}`);
      return cached;
    }

    // Cache miss - fetch data
    Logger.debug(`Cache miss for key: ${key}`);
    const data = await fetchFn();

    // Store in cache
    await this.set(key, data, ttl);

    return data;
  }

  /**
   * Flush all cached data
   * @returns {Promise<void>}
   */
  public async flush(): Promise<void> {
    this.memoryCache.clear();

    if (!this.useMemoryFallback && this.client) {
      try {
        await this.client.flushdb();
      } catch {
        // Ignore
      }
    }
    Logger.info("Cache flushed");
  }

  /**
   * Delete keys matching pattern
   * @param {string} pattern - Key pattern (e.g., "user:*")
   * @returns {Promise<number>} Number of keys deleted
   */
  public async deletePattern(pattern: string): Promise<number> {
    // Clear memory cache entries matching pattern
    let count = 0;
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        count++;
      }
    }

    if (!this.useMemoryFallback && this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          count += await this.client.del(...keys);
        }
      } catch {
        // Ignore
      }
    }

    return count;
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  public getConnectionStatus(): boolean {
    return this.isConnected || this.useMemoryFallback;
  }

  /**
   * Get Redis client for advanced operations
   * @returns {Redis | null}
   */
  public getClient(): Redis | null {
    return this.client;
  }

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
    this.isConnected = false;
    this.memoryCache.clear();
    Logger.info("Cache disconnected");
  }
}

// Export singleton instance
export const CacheService = RedisCacheService.getInstance();
