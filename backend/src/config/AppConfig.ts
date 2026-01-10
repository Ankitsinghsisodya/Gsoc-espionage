import dotenv from "dotenv";
import { ConfigurationError } from "../core/errors/index.js";

// Load environment variables
dotenv.config();

/**
 * Application configuration class
 * Singleton pattern for centralized configuration management
 * @class AppConfig
 */
export class AppConfig {
  private static instance: AppConfig;

  // Server
  public readonly nodeEnv: string;
  public readonly port: number;
  public readonly isDevelopment: boolean;
  public readonly isProduction: boolean;

  // MongoDB
  public readonly mongodbUri: string;

  // Redis
  public readonly redisHost: string;
  public readonly redisPort: number;
  public readonly redisPassword: string;

  // GitHub OAuth
  public readonly githubClientId: string;
  public readonly githubClientSecret: string;
  public readonly githubCallbackUrl: string;

  // Google OAuth
  public readonly googleClientId: string;
  public readonly googleClientSecret: string;
  public readonly googleCallbackUrl: string;

  // Security
  public readonly sessionSecret: string;
  public readonly jwtSecret: string;

  // Logging
  public readonly logLevel: string;

  // CORS
  public readonly allowedOrigins: string[];

  // Rate Limiting
  public readonly rateLimitWindowMs: number;
  public readonly rateLimitMaxRequests: number;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Server
    this.nodeEnv = this.getEnvVar("NODE_ENV", "development");
    this.port = parseInt(this.getEnvVar("PORT", "3001"), 10);
    this.isDevelopment = this.nodeEnv === "development";
    this.isProduction = this.nodeEnv === "production";

    // MongoDB
    this.mongodbUri = this.getEnvVar(
      "MONGODB_URI",
      "mongodb://localhost:27017/pr-analyzer"
    );

    // Redis
    this.redisHost = this.getEnvVar("REDIS_HOST", "localhost");
    this.redisPort = parseInt(this.getEnvVar("REDIS_PORT", "6379"), 10);
    this.redisPassword = this.getEnvVar("REDIS_PASSWORD", "");

    // GitHub OAuth (optional)
    this.githubClientId = this.getEnvVar("GITHUB_CLIENT_ID", "");
    this.githubClientSecret = this.getEnvVar("GITHUB_CLIENT_SECRET", "");
    this.githubCallbackUrl = this.getEnvVar(
      "GITHUB_CALLBACK_URL",
      "http://localhost:3001/auth/github/callback"
    );

    // Google OAuth (optional)
    this.googleClientId = this.getEnvVar("GOOGLE_CLIENT_ID", "");
    this.googleClientSecret = this.getEnvVar("GOOGLE_CLIENT_SECRET", "");
    this.googleCallbackUrl = this.getEnvVar(
      "GOOGLE_CALLBACK_URL",
      "http://localhost:3001/auth/google/callback"
    );

    // Security
    this.sessionSecret = this.getEnvVar(
      "SESSION_SECRET",
      "dev-session-secret-change-in-prod"
    );
    this.jwtSecret = this.getEnvVar(
      "JWT_SECRET",
      "dev-jwt-secret-change-in-prod"
    );

    // Logging
    this.logLevel = this.getEnvVar("LOG_LEVEL", "info");

    // CORS
    const originsStr = this.getEnvVar(
      "ALLOWED_ORIGINS",
      "http://localhost:5173"
    );
    this.allowedOrigins = originsStr.split(",").map((origin) => origin.trim());

    // Rate Limiting
    this.rateLimitWindowMs = parseInt(
      this.getEnvVar("RATE_LIMIT_WINDOW_MS", "900000"),
      10
    );
    this.rateLimitMaxRequests = parseInt(
      this.getEnvVar("RATE_LIMIT_MAX_REQUESTS", "100"),
      10
    );
  }

  /**
   * Get singleton instance
   * @returns {AppConfig} Configuration instance
   */
  public static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  /**
   * Get environment variable with optional default
   * @param {string} key - Environment variable name
   * @param {string} defaultValue - Default value if not set
   * @returns {string} Environment variable value
   */
  private getEnvVar(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new ConfigurationError(
        `Missing required environment variable: ${key}`,
        key
      );
    }
    return value;
  }

  /**
   * Check if GitHub OAuth is configured
   * @returns {boolean}
   */
  public isGitHubOAuthConfigured(): boolean {
    return Boolean(this.githubClientId && this.githubClientSecret);
  }

  /**
   * Check if Google OAuth is configured
   * @returns {boolean}
   */
  public isGoogleOAuthConfigured(): boolean {
    return Boolean(this.googleClientId && this.googleClientSecret);
  }

  /**
   * Validate critical configuration for production
   * @throws {ConfigurationError} If critical config is missing
   */
  public validateForProduction(): void {
    if (this.isProduction) {
      if (this.sessionSecret === "dev-session-secret-change-in-prod") {
        throw new ConfigurationError(
          "SESSION_SECRET must be changed for production"
        );
      }
      if (this.jwtSecret === "dev-jwt-secret-change-in-prod") {
        throw new ConfigurationError(
          "JWT_SECRET must be changed for production"
        );
      }
    }
  }
}

// Export singleton instance
export const config = AppConfig.getInstance();
