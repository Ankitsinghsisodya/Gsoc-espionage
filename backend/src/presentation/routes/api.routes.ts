import { Router } from "express";
import {
  bookmarkController,
  exportController,
  historyController,
  repositoryController,
  userProfileController,
} from "../controllers/index.js";
import { AuthMiddleware, RateLimiter } from "../middleware/index.js";

/**
 * API routes configuration
 * All routes return JSON responses
 */
const router = Router();

// Apply GitHub rate limiting to all API routes
router.use(RateLimiter.github());

// ============================================
// Repository Analysis Routes
// ============================================

/**
 * @route GET /api/v1/repos/analyze
 * @desc Analyze a repository by URL
 * @access Public (enhanced with auth)
 */
router.get(
  "/repos/analyze",
  AuthMiddleware.optionalAuth,
  repositoryController.analyze
);

/**
 * @route GET /api/v1/repos/:owner/:repo/stats
 * @desc Get repository statistics
 * @access Public (enhanced with auth)
 */
router.get(
  "/repos/:owner/:repo/stats",
  AuthMiddleware.optionalAuth,
  repositoryController.getStats
);

/**
 * @route GET /api/v1/repos/:owner/:repo/branches
 * @desc Get repository branches
 * @access Public (enhanced with auth)
 */
router.get(
  "/repos/:owner/:repo/branches",
  AuthMiddleware.optionalAuth,
  repositoryController.getBranches
);

/**
 * @route GET /api/v1/repos/:owner/:repo/prs
 * @desc Get repository pull requests
 * @access Public (enhanced with auth)
 */
router.get(
  "/repos/:owner/:repo/prs",
  AuthMiddleware.optionalAuth,
  repositoryController.getPullRequests
);

/**
 * @route GET /api/v1/repos/:owner/:repo/contributors
 * @desc Get repository contributors
 * @access Public (enhanced with auth)
 */
router.get(
  "/repos/:owner/:repo/contributors",
  AuthMiddleware.optionalAuth,
  repositoryController.getContributors
);

// ============================================
// User Profile Routes
// ============================================

/**
 * @route GET /api/v1/users/compare
 * @desc Compare multiple users
 * @access Public (enhanced with auth)
 */
router.get(
  "/users/compare",
  AuthMiddleware.optionalAuth,
  userProfileController.compare
);

/**
 * @route GET /api/v1/users/:username/profile
 * @desc Get user profile
 * @access Public (enhanced with auth)
 */
router.get(
  "/users/:username/profile",
  AuthMiddleware.optionalAuth,
  userProfileController.getProfile
);

/**
 * @route GET /api/v1/users/:username/stats
 * @desc Get user statistics
 * @access Public (enhanced with auth)
 */
router.get(
  "/users/:username/stats",
  AuthMiddleware.optionalAuth,
  userProfileController.getStats
);

/**
 * @route GET /api/v1/users/:username/repositories
 * @desc Get user's contributed repositories
 * @access Public (enhanced with auth)
 */
router.get(
  "/users/:username/repositories",
  AuthMiddleware.optionalAuth,
  userProfileController.getRepositories
);

/**
 * @route GET /api/v1/users/:username/prs
 * @desc Get user's pull requests
 * @access Public (enhanced with auth)
 */
router.get(
  "/users/:username/prs",
  AuthMiddleware.optionalAuth,
  userProfileController.getPullRequests
);

// ============================================
// Bookmark Routes (Authenticated)
// ============================================

/**
 * @route GET /api/v1/bookmarks
 * @desc Get user's bookmarks
 * @access Private
 */
router.get(
  "/bookmarks",
  AuthMiddleware.requireAuth,
  bookmarkController.getBookmarks
);

/**
 * @route POST /api/v1/bookmarks
 * @desc Add a bookmark
 * @access Private
 */
router.post(
  "/bookmarks",
  AuthMiddleware.requireAuth,
  bookmarkController.addBookmark
);

/**
 * @route DELETE /api/v1/bookmarks/:id
 * @desc Delete a bookmark
 * @access Private
 */
router.delete(
  "/bookmarks/:id",
  AuthMiddleware.requireAuth,
  bookmarkController.deleteBookmark
);

// ============================================
// History Routes (Authenticated)
// ============================================

/**
 * @route GET /api/v1/history
 * @desc Get analysis history
 * @access Private
 */
router.get(
  "/history",
  AuthMiddleware.requireAuth,
  historyController.getHistory
);

/**
 * @route DELETE /api/v1/history/:id
 * @desc Delete a history entry
 * @access Private
 */
router.delete(
  "/history/:id",
  AuthMiddleware.requireAuth,
  historyController.deleteHistory
);

/**
 * @route DELETE /api/v1/history
 * @desc Clear all history
 * @access Private
 */
router.delete(
  "/history",
  AuthMiddleware.requireAuth,
  historyController.clearHistory
);

// ============================================
// Export Routes
// ============================================

/**
 * @route GET /api/v1/export/csv
 * @desc Export data as CSV
 * @access Public (enhanced with auth)
 */
router.get(
  "/export/csv",
  AuthMiddleware.optionalAuth,
  exportController.exportCsv
);

/**
 * @route GET /api/v1/export/json
 * @desc Export data as JSON
 * @access Public (enhanced with auth)
 */
router.get(
  "/export/json",
  AuthMiddleware.optionalAuth,
  exportController.exportJson
);

/**
 * @route POST /api/v1/export/pdf
 * @desc Export data as PDF
 * @access Public (enhanced with auth)
 */
router.post(
  "/export/pdf",
  AuthMiddleware.optionalAuth,
  exportController.exportPdf
);

export default router;
