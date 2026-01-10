import winston from "winston";
import { config } from "../../config/AppConfig.js";

/**
 * Custom log format with timestamp and colorization
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

/**
 * Console format with colors for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  customFormat
);

/**
 * Logger class - Singleton pattern for application-wide logging
 * @class Logger
 */
class LoggerClass {
  private static instance: LoggerClass;
  private logger: winston.Logger;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        format: consoleFormat,
      }),
    ];

    // Add file transport in production
    if (config.isProduction) {
      transports.push(
        new winston.transports.File({
          filename: "logs/error.log",
          level: "error",
          format: customFormat,
        }),
        new winston.transports.File({
          filename: "logs/combined.log",
          format: customFormat,
        })
      );
    }

    this.logger = winston.createLogger({
      level: config.logLevel,
      transports,
    });
  }

  /**
   * Get singleton instance
   * @returns {LoggerClass}
   */
  public static getInstance(): LoggerClass {
    if (!LoggerClass.instance) {
      LoggerClass.instance = new LoggerClass();
    }
    return LoggerClass.instance;
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  public info(message: string, meta?: object): void {
    this.logger.info(message, meta);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error | object} error - Error object or metadata
   */
  public error(message: string, error?: Error | object): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        stack: error.stack,
        message: error.message,
      });
    } else {
      this.logger.error(message, error);
    }
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  public warn(message: string, meta?: object): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  public debug(message: string, meta?: object): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log HTTP request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {number} statusCode - Response status code
   * @param {number} duration - Request duration in ms
   */
  public http(
    method: string,
    url: string,
    statusCode: number,
    duration: number
  ): void {
    const level = statusCode >= 400 ? "warn" : "info";
    this.logger[level](`${method} ${url} ${statusCode} ${duration}ms`);
  }
}

// Export singleton instance
export const Logger = LoggerClass.getInstance();
