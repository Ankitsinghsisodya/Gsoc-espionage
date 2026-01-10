import { NextFunction, Request, Response } from "express";
import { BaseError } from "../../core/errors/index.js";
import { HTTP_STATUS } from "../../shared/constants/index.js";

/**
 * Abstract base controller providing common functionality
 * Implements Template Method pattern for request handling
 * @abstract
 * @class BaseController
 */
export abstract class BaseController {
  /**
   * Send success JSON response
   * @param {Response} res - Express response
   * @param {object} data - Response data
   * @param {number} statusCode - HTTP status code
   */
  protected sendSuccess(
    res: Response,
    data: object,
    statusCode: number = HTTP_STATUS.OK
  ): void {
    res.status(statusCode).json({
      success: true,
      data,
    });
  }

  /**
   * Send created response
   * @param {Response} res - Express response
   * @param {object} data - Created resource data
   */
  protected sendCreated(res: Response, data: object): void {
    this.sendSuccess(res, data, HTTP_STATUS.CREATED);
  }

  /**
   * Send no content response
   * @param {Response} res - Express response
   */
  protected sendNoContent(res: Response): void {
    res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  /**
   * Send error response
   * @param {Response} res - Express response
   * @param {BaseError | Error} error - Error object
   */
  protected sendError(res: Response, error: BaseError | Error): void {
    if (error instanceof BaseError) {
      res.status(error.statusCode).json(error.toJSON());
    } else {
      res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  }

  /**
   * Wrap async handler with error catching
   * @param {Function} fn - Async handler function
   * @returns {Function} Wrapped handler
   */
  protected asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Get pagination parameters from request
   * @param {Request} req - Express request
   * @returns {{ page: number; limit: number }}
   */
  protected getPagination(req: Request): { page: number; limit: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20)
    );
    return { page, limit };
  }

  /**
   * Get time filter from request
   * @param {Request} req - Express request
   * @returns {string}
   */
  protected getTimeFilter(req: Request): string {
    const valid = ["2w", "1m", "3m", "6m", "all"];
    const filter = req.query.filter as string;
    return valid.includes(filter) ? filter : "1m";
  }

  /**
   * Get branch from request
   * @param {Request} req - Express request
   * @returns {string}
   */
  protected getBranch(req: Request): string {
    return (req.query.branch as string) || "";
  }
}
