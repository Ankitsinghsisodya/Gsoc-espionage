/**
 * Base error class for application errors
 * Provides consistent error structure across the application
 * @abstract
 * @class BaseError
 * @extends Error
 */
export abstract class BaseError extends Error {
  /** HTTP status code */
  public readonly statusCode: number;
  /** Error code for client identification */
  public readonly code: string;
  /** Whether error is operational (expected) vs programming error */
  public readonly isOperational: boolean;
  /** Additional error details */
  public readonly details?: Record<string, unknown>;

  /**
   * Create a new BaseError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code
   * @param {boolean} isOperational - Whether error is operational
   * @param {Record<string, unknown>} details - Additional details
   */
  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Convert error to JSON for API responses
   * @returns {object} JSON representation
   */
  public toJSON(): object {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Validation error for invalid input data
 * @class ValidationError
 * @extends BaseError
 */
export class ValidationError extends BaseError {
  /**
   * Create a new ValidationError
   * @param {string} message - Error message
   * @param {Record<string, unknown>} details - Validation details
   */
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", true, details);
  }
}

/**
 * Not found error for missing resources
 * @class NotFoundError
 * @extends BaseError
 */
export class NotFoundError extends BaseError {
  /**
   * Create a new NotFoundError
   * @param {string} resource - Name of the missing resource
   * @param {string} identifier - Resource identifier
   */
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND", true, { resource, identifier });
  }
}

/**
 * Unauthorized error for authentication failures
 * @class UnauthorizedError
 * @extends BaseError
 */
export class UnauthorizedError extends BaseError {
  /**
   * Create a new UnauthorizedError
   * @param {string} message - Error message
   */
  constructor(message: string = "Authentication required") {
    super(message, 401, "UNAUTHORIZED", true);
  }
}

/**
 * Forbidden error for authorization failures
 * @class ForbiddenError
 * @extends BaseError
 */
export class ForbiddenError extends BaseError {
  /**
   * Create a new ForbiddenError
   * @param {string} message - Error message
   */
  constructor(message: string = "Access denied") {
    super(message, 403, "FORBIDDEN", true);
  }
}

/**
 * Rate limit error for API rate limiting
 * @class RateLimitError
 * @extends BaseError
 */
export class RateLimitError extends BaseError {
  /** Rate limit reset time */
  public readonly resetAt: Date;

  /**
   * Create a new RateLimitError
   * @param {string} message - Error message
   * @param {Date} resetAt - When rate limit resets
   */
  constructor(
    message: string = "Rate limit exceeded",
    resetAt: Date = new Date()
  ) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", true, {
      resetAt: resetAt.toISOString(),
    });
    this.resetAt = resetAt;
  }
}

/**
 * GitHub API specific error
 * @class GitHubApiError
 * @extends BaseError
 */
export class GitHubApiError extends BaseError {
  /** Original GitHub error response */
  public readonly githubError?: unknown;

  /**
   * Create a new GitHubApiError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code from GitHub
   * @param {unknown} githubError - Original GitHub error
   */
  constructor(
    message: string,
    statusCode: number = 500,
    githubError?: unknown
  ) {
    super(message, statusCode, "GITHUB_API_ERROR", true, {
      originalError: githubError,
    });
    this.githubError = githubError;
  }
}

/**
 * Configuration error for missing or invalid config
 * @class ConfigurationError
 * @extends BaseError
 */
export class ConfigurationError extends BaseError {
  /**
   * Create a new ConfigurationError
   * @param {string} message - Error message
   * @param {string} configKey - Missing or invalid config key
   */
  constructor(message: string, configKey?: string) {
    super(message, 500, "CONFIGURATION_ERROR", false, { configKey });
  }
}

/**
 * Database error for database operations
 * @class DatabaseError
 * @extends BaseError
 */
export class DatabaseError extends BaseError {
  /**
   * Create a new DatabaseError
   * @param {string} message - Error message
   * @param {unknown} originalError - Original database error
   */
  constructor(message: string, originalError?: unknown) {
    super(message, 500, "DATABASE_ERROR", false, {
      originalError:
        originalError instanceof Error ? originalError.message : originalError,
    });
  }
}

/**
 * Cache error for cache operations
 * @class CacheError
 * @extends BaseError
 */
export class CacheError extends BaseError {
  /**
   * Create a new CacheError
   * @param {string} message - Error message
   * @param {unknown} originalError - Original cache error
   */
  constructor(message: string, originalError?: unknown) {
    super(message, 500, "CACHE_ERROR", true, {
      originalError:
        originalError instanceof Error ? originalError.message : originalError,
    });
  }
}

/**
 * External service error for third-party service failures
 * @class ExternalServiceError
 * @extends BaseError
 */
export class ExternalServiceError extends BaseError {
  /**
   * Create a new ExternalServiceError
   * @param {string} serviceName - Name of the external service
   * @param {string} message - Error message
   * @param {unknown} originalError - Original error from service
   */
  constructor(serviceName: string, message: string, originalError?: unknown) {
    super(`${serviceName}: ${message}`, 502, "EXTERNAL_SERVICE_ERROR", true, {
      service: serviceName,
      originalError:
        originalError instanceof Error ? originalError.message : originalError,
    });
  }
}
