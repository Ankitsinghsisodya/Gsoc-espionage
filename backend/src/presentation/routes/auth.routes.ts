import { Router } from "express";
import { authController } from "../controllers/index.js";
import { AuthMiddleware, RateLimiter } from "../middleware/index.js";

/**
 * Authentication routes configuration
 */
const router = Router();

// Apply stricter rate limiting to auth routes
router.use(RateLimiter.auth());

// ============================================
// GitHub OAuth
// ============================================

/**
 * @route GET /auth/github
 * @desc Redirect to GitHub OAuth
 * @access Public
 */
router.get("/github", authController.githubAuth);

/**
 * @route GET /auth/github/callback
 * @desc Handle GitHub OAuth callback
 * @access Public
 */
router.get("/github/callback", authController.githubCallback);

// ============================================
// Google OAuth
// ============================================

/**
 * @route GET /auth/google
 * @desc Redirect to Google OAuth
 * @access Public
 */
router.get("/google", authController.googleAuth);

/**
 * @route GET /auth/google/callback
 * @desc Handle Google OAuth callback
 * @access Public
 */
router.get("/google/callback", authController.googleCallback);

// ============================================
// Session Management
// ============================================

/**
 * @route GET /auth/me
 * @desc Get current authenticated user
 * @access Optional Auth
 */
router.get("/me", AuthMiddleware.optionalAuth, authController.getCurrentUser);

/**
 * @route POST /auth/logout
 * @desc Logout and destroy session
 * @access Private
 */
router.post("/logout", AuthMiddleware.optionalAuth, authController.logout);

export default router;
