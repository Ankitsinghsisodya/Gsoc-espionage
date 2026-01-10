import { Request, Response } from "express";
import { authService } from "../../application/services/AuthService.js";
import { config } from "../../config/AppConfig.js";
import { UnauthorizedError } from "../../core/errors/index.js";
import { UserModel } from "../../models/index.js";
import { Logger } from "../../shared/utils/index.js";
import { BaseController } from "./BaseController.js";

/**
 * Authentication controller for OAuth flows
 * @class AuthController
 * @extends {BaseController}
 */
export class AuthController extends BaseController {
  /**
   * Redirect to GitHub OAuth
   * GET /auth/github
   */
  public githubAuth = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      if (!config.isGitHubOAuthConfigured()) {
        this.sendError(
          res,
          new UnauthorizedError("GitHub OAuth not configured")
        );
        return;
      }

      const state = Math.random().toString(36).substring(7);
      const params = new URLSearchParams({
        client_id: config.githubClientId,
        redirect_uri: config.githubCallbackUrl,
        scope: "read:user user:email repo",
        state,
      });

      res.redirect(`https://github.com/login/oauth/authorize?${params}`);
    }
  );

  /**
   * Handle GitHub OAuth callback
   * GET /auth/github/callback
   */
  public githubCallback = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        throw new UnauthorizedError("Authorization code missing");
      }

      try {
        // Exchange code for access token
        const tokenResponse = await fetch(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              client_id: config.githubClientId,
              client_secret: config.githubClientSecret,
              code,
            }),
          }
        );

        const tokenData = (await tokenResponse.json()) as any;

        if (tokenData.error) {
          throw new UnauthorizedError(
            tokenData.error_description || "OAuth error"
          );
        }

        const accessToken = tokenData.access_token;

        // Fetch user info
        const userResponse = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        const userData = (await userResponse.json()) as any;

        // Create or update user
        let user = await UserModel.findOne({
          githubId: userData.id.toString(),
        });

        if (!user) {
          user = await UserModel.create({
            githubId: userData.id.toString(),
            username: userData.login,
            email: userData.email,
            avatarUrl: userData.avatar_url,
            accessToken,
            lastLoginAt: new Date(),
          });
        } else {
          user.accessToken = accessToken;
          user.lastLoginAt = new Date();
          user.avatarUrl = userData.avatar_url;
          await user.save();
        }

        // Create session
        const { token, sessionId } = await authService.createSession({
          id: user._id.toString(),
          githubId: user.githubId,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          accessToken,
          settings: user.settings,
          createdAt: user.createdAt,
        });

        // Redirect to frontend with token
        const frontendUrl = config.allowedOrigins[0] || "http://localhost:5173";
        res.redirect(
          `${frontendUrl}/auth/callback?token=${token}&sessionId=${sessionId}`
        );
      } catch (error) {
        Logger.error("GitHub OAuth error", error as Error);
        const frontendUrl = config.allowedOrigins[0] || "http://localhost:5173";
        res.redirect(`${frontendUrl}/auth/error?message=Authentication failed`);
      }
    }
  );

  /**
   * Redirect to Google OAuth
   * GET /auth/google
   */
  public googleAuth = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      if (!config.isGoogleOAuthConfigured()) {
        this.sendError(
          res,
          new UnauthorizedError("Google OAuth not configured")
        );
        return;
      }

      const params = new URLSearchParams({
        client_id: config.googleClientId,
        redirect_uri: config.googleCallbackUrl,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
      });

      res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    }
  );

  /**
   * Handle Google OAuth callback
   * GET /auth/google/callback
   */
  public googleCallback = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        throw new UnauthorizedError("Authorization code missing");
      }

      try {
        // Exchange code for tokens
        const tokenResponse = await fetch(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              code,
              client_id: config.googleClientId,
              client_secret: config.googleClientSecret,
              redirect_uri: config.googleCallbackUrl,
              grant_type: "authorization_code",
            }),
          }
        );

        const tokenData = (await tokenResponse.json()) as any;

        if (tokenData.error) {
          throw new UnauthorizedError(
            tokenData.error_description || "OAuth error"
          );
        }

        // Fetch user info
        const userResponse = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          }
        );

        const userData = (await userResponse.json()) as any;

        // Create or update user
        let user = await UserModel.findOne({ googleId: userData.id });

        if (!user) {
          user = await UserModel.create({
            googleId: userData.id,
            username: userData.name || userData.email.split("@")[0],
            email: userData.email,
            avatarUrl: userData.picture,
            lastLoginAt: new Date(),
          });
        } else {
          user.lastLoginAt = new Date();
          user.avatarUrl = userData.picture;
          await user.save();
        }

        // Create session
        const { token, sessionId } = await authService.createSession({
          id: user._id.toString(),
          googleId: user.googleId,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          settings: user.settings,
          createdAt: user.createdAt,
        });

        const frontendUrl = config.allowedOrigins[0] || "http://localhost:5173";
        res.redirect(
          `${frontendUrl}/auth/callback?token=${token}&sessionId=${sessionId}`
        );
      } catch (error) {
        Logger.error("Google OAuth error", error as Error);
        const frontendUrl = config.allowedOrigins[0] || "http://localhost:5173";
        res.redirect(`${frontendUrl}/auth/error?message=Authentication failed`);
      }
    }
  );

  /**
   * Get current user
   * GET /auth/me
   */
  public getCurrentUser = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      if (!req.user) {
        this.sendSuccess(res, { user: null });
        return;
      }

      this.sendSuccess(res, {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          avatarUrl: req.user.avatarUrl,
          settings: req.user.settings,
        },
      });
    }
  );

  /**
   * Logout
   * POST /auth/logout
   */
  public logout = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      if (req.sessionId) {
        await authService.destroySession(req.sessionId);
      }

      this.sendSuccess(res, { message: "Logged out successfully" });
    }
  );
}

// Export singleton instance
export const authController = new AuthController();
