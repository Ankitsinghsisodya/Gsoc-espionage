import { NextFunction, Request, Response } from "express";
import { config } from "../../config/AppConfig.js";
import { BaseError } from "../../core/errors/index.js";
import { Logger } from "../../shared/utils/index.js";

/**
 * Centralized error handling middleware
 * @class ErrorHandler
 */
export class ErrorHandler {
  /**
   * Handle errors and send appropriate response
   * @param {Error} error - Error object
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {NextFunction} next - Next middleware
   */
  public static handle(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Log the error
    Logger.error(`Error handling request ${req.method} ${req.path}`, error);

    // Handle BaseError (our custom errors)
    if (error instanceof BaseError) {
      res.status(error.statusCode).json(error.toJSON());
      return;
    }

    // Handle validation errors from express-validator or similar
    if (error.name === "ValidationError") {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
        },
      });
      return;
    }

    // Handle mongoose errors
    if (error.name === "CastError") {
      res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Invalid ID format",
        },
      });
      return;
    }

    // Handle duplicate key errors
    if ((error as any).code === 11000) {
      res.status(409).json({
        error: {
          code: "DUPLICATE_ENTRY",
          message: "Resource already exists",
        },
      });
      return;
    }

    // Default internal server error
    const response: any = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };

    // Include stack trace in development
    if (config.isDevelopment) {
      response.error.stack = error.stack;
      response.error.details = error.message;
    }

    res.status(500).json(response);
  }

  /**
   * Handle 404 Not Found for unmatched routes
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  public static notFound(req: Request, res: Response): void {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  }
}
