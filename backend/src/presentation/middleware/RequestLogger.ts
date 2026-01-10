import { NextFunction, Request, Response } from "express";
import { Logger } from "../../shared/utils/index.js";

/**
 * Request logging middleware
 * @class RequestLogger
 */
export class RequestLogger {
  /**
   * Log incoming requests and response times
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {NextFunction} next - Next middleware
   */
  public static log(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Log request
    Logger.debug(`--> ${req.method} ${req.path}`, {
      query: req.query,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Log response on finish
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      Logger.http(req.method, req.path, res.statusCode, duration);
    });

    next();
  }
}
