import rateLimit from "express-rate-limit";
import { config } from "../../config/AppConfig.js";

/**
 * Rate limiting middleware factory
 * @class RateLimiter
 */
export class RateLimiter {
  /**
   * Create general API rate limiter
   * @returns {rateLimit.RateLimitRequestHandler}
   */
  public static general(): ReturnType<typeof rateLimit> {
    return rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMaxRequests,
      message: {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests, please try again later",
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  /**
   * Create stricter rate limiter for auth endpoints
   * @returns {rateLimit.RateLimitRequestHandler}
   */
  public static auth(): ReturnType<typeof rateLimit> {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // 20 requests per window
      message: {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many authentication attempts, please try again later",
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  /**
   * Create rate limiter for GitHub API endpoints
   * @returns {rateLimit.RateLimitRequestHandler}
   */
  public static github(): ReturnType<typeof rateLimit> {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 requests per minute
      message: {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many GitHub API requests, please try again later",
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }
}
