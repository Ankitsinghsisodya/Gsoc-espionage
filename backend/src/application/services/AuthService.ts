import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../../config/AppConfig.js";
import { IUser } from "../../core/entities/index.js";
import { ICacheService } from "../../core/interfaces/index.js";
import { CacheService } from "../../infrastructure/cache/RedisCacheService.js";
import { UserModel } from "../../models/index.js";
import { CACHE_KEYS, CACHE_TTL } from "../../shared/constants/index.js";
import { Logger } from "../../shared/utils/index.js";

/**
 * Session data stored in cache
 * @interface SessionData
 */
interface SessionData {
  userId: string;
  username: string;
  accessToken: string;
  createdAt: number;
}

/**
 * JWT payload structure
 * @interface JwtPayload
 */
interface JwtPayload {
  userId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication service for session and token management
 * @class AuthService
 */
export class AuthService {
  private cacheService: ICacheService;

  /**
   * Create new AuthService instance
   */
  constructor() {
    this.cacheService = CacheService;
  }

  /**
   * Create a new session for authenticated user
   * @param {IUser} user - Authenticated user
   * @returns {Promise<{ sessionId: string; token: string }>}
   */
  public async createSession(
    user: IUser
  ): Promise<{ sessionId: string; token: string }> {
    const sessionId = uuidv4();

    const sessionData: SessionData = {
      userId: user.id,
      username: user.username,
      accessToken: user.accessToken || "",
      createdAt: Date.now(),
    };

    // Store session in Redis
    await this.cacheService.set(
      CACHE_KEYS.session(sessionId),
      sessionData,
      CACHE_TTL.SESSION
    );

    // Create JWT token
    const token = this.generateToken(user.id, sessionId);

    Logger.info(`Session created for user: ${user.username}`, { sessionId });

    return { sessionId, token };
  }

  /**
   * Validate session and return user
   * @param {string} sessionId - Session ID
   * @returns {Promise<IUser | null>}
   */
  public async validateSession(sessionId: string): Promise<IUser | null> {
    try {
      const sessionData = await this.cacheService.get<SessionData>(
        CACHE_KEYS.session(sessionId)
      );

      if (!sessionData) {
        return null;
      }

      // Fetch user from database
      const user = await UserModel.findById(sessionData.userId);

      if (!user) {
        // Session exists but user doesn't - clean up
        await this.destroySession(sessionId);
        return null;
      }

      return this.mapUserDocument(user);
    } catch (error) {
      Logger.error("Session validation error", error as Error);
      return null;
    }
  }

  /**
   * Validate JWT token and return user
   * @param {string} token - JWT token
   * @returns {Promise<IUser | null>}
   */
  public async validateToken(token: string): Promise<IUser | null> {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      return await this.validateSession(payload.sessionId);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        Logger.debug("Token expired");
      } else if (error instanceof jwt.JsonWebTokenError) {
        Logger.debug("Invalid token");
      }
      return null;
    }
  }

  /**
   * Destroy session (logout)
   * @param {string} sessionId - Session ID to destroy
   * @returns {Promise<void>}
   */
  public async destroySession(sessionId: string): Promise<void> {
    await this.cacheService.delete(CACHE_KEYS.session(sessionId));
    Logger.info("Session destroyed", { sessionId });
  }

  /**
   * Refresh session TTL
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  public async refreshSession(sessionId: string): Promise<void> {
    const sessionData = await this.cacheService.get<SessionData>(
      CACHE_KEYS.session(sessionId)
    );

    if (sessionData) {
      await this.cacheService.set(
        CACHE_KEYS.session(sessionId),
        sessionData,
        CACHE_TTL.SESSION
      );
    }
  }

  /**
   * Get session's GitHub access token
   * @param {string} sessionId - Session ID
   * @returns {Promise<string | null>}
   */
  public async getAccessToken(sessionId: string): Promise<string | null> {
    const sessionData = await this.cacheService.get<SessionData>(
      CACHE_KEYS.session(sessionId)
    );

    return sessionData?.accessToken || null;
  }

  /**
   * Generate JWT token
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @returns {string} JWT token
   */
  private generateToken(userId: string, sessionId: string): string {
    return jwt.sign({ userId, sessionId }, config.jwtSecret, {
      expiresIn: "24h",
    });
  }

  /**
   * Map Mongoose document to IUser
   */
  private mapUserDocument(doc: any): IUser {
    return {
      id: doc._id.toString(),
      githubId: doc.githubId,
      googleId: doc.googleId,
      username: doc.username,
      email: doc.email,
      avatarUrl: doc.avatarUrl,
      accessToken: doc.accessToken,
      refreshToken: doc.refreshToken,
      tokenExpiresAt: doc.tokenExpiresAt,
      settings: doc.settings,
      createdAt: doc.createdAt,
      lastLoginAt: doc.lastLoginAt,
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
