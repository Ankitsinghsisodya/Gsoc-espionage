import { NextFunction, Request, Response } from "express";
import { authService } from "../../application/services/AuthService.js";
import { IUser } from "../../core/entities/index.js";
import { UnauthorizedError } from "../../core/errors/index.js";
import { Logger } from "../../shared/utils/index.js";

/**
 * Extend Express Request to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      sessionId?: string;
    }
  }
}

/**
 * Authentication middleware for protecting routes
 * @class AuthMiddleware
 */
export class AuthMiddleware {
  /**
   * Require authentication - rejects unauthenticated requests
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {NextFunction} next - Next middleware
   */
  public static async requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await AuthMiddleware.extractUser(req);

      if (!user) {
        throw new UnauthorizedError("Authentication required");
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Optional authentication - attaches user if present but doesn't reject
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {NextFunction} next - Next middleware
   */
  public static async optionalAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await AuthMiddleware.extractUser(req);

      if (user) {
        req.user = user;
      }

      next();
    } catch (error) {
      // Log error but don't reject - auth is optional
      Logger.debug("Optional auth failed", { error });
      next();
    }
  }

  /**
   * Extract user from request (token or session)
   * @param {Request} req - Express request
   * @returns {Promise<IUser | null>}
   */
  private static async extractUser(req: Request): Promise<IUser | null> {
    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      return await authService.validateToken(token);
    }

    // Try session cookie
    const sessionId = req.cookies?.sessionId || req.headers["x-session-id"];
    if (sessionId && typeof sessionId === "string") {
      req.sessionId = sessionId;
      return await authService.validateSession(sessionId);
    }

    return null;
  }
}
