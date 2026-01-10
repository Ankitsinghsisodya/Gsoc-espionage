import { Request, Response } from "express";
import { GitHubService } from "../../application/services/GitHubService.js";
import { TimeFilter } from "../../core/entities/index.js";
import { BaseController } from "./BaseController.js";

/**
 * User profile analysis controller
 * Handles user statistics and contribution data endpoints
 * @class UserProfileController
 * @extends {BaseController}
 */
export class UserProfileController extends BaseController {
  private gitHubService: GitHubService;

  /**
   * Create new UserProfileController instance
   */
  constructor() {
    super();
    this.gitHubService = new GitHubService();
  }

  /**
   * Get user profile statistics
   * GET /api/v1/users/:username/profile
   */
  public getProfile = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const filter = this.getTimeFilter(req) as TimeFilter;

      if (req.user?.accessToken) {
        this.gitHubService.setAuthToken(req.user.accessToken);
      }

      const stats = await this.gitHubService.fetchUserStats(username, filter);

      this.sendSuccess(res, stats);
    }
  );

  /**
   * Get user statistics
   * GET /api/v1/users/:username/stats
   */
  public getStats = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const filter = this.getTimeFilter(req) as TimeFilter;

      if (req.user?.accessToken) {
        this.gitHubService.setAuthToken(req.user.accessToken);
      }

      const stats = await this.gitHubService.fetchUserStats(username, filter);

      this.sendSuccess(res, {
        username: stats.username,
        avatarUrl: stats.avatarUrl,
        totalStats: stats.totalStats,
        repositoryCount: Object.keys(stats.repositories).length,
      });
    }
  );

  /**
   * Get user's contributed repositories
   * GET /api/v1/users/:username/repositories
   */
  public getRepositories = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const filter = this.getTimeFilter(req) as TimeFilter;

      if (req.user?.accessToken) {
        this.gitHubService.setAuthToken(req.user.accessToken);
      }

      const stats = await this.gitHubService.fetchUserStats(username, filter);

      // Sort repositories by PR count
      const repositories = Object.values(stats.repositories).sort(
        (a, b) => b.prCount - a.prCount
      );

      this.sendSuccess(res, { repositories });
    }
  );

  /**
   * Get user's pull requests
   * GET /api/v1/users/:username/prs
   */
  public getPullRequests = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const filter = this.getTimeFilter(req) as TimeFilter;
      const { page, limit } = this.getPagination(req);

      if (req.user?.accessToken) {
        this.gitHubService.setAuthToken(req.user.accessToken);
      }

      const stats = await this.gitHubService.fetchUserStats(username, filter);

      // Paginate PRs
      const start = (page - 1) * limit;
      const paginatedPRs = stats.pullRequests.slice(start, start + limit);

      this.sendSuccess(res, {
        pullRequests: paginatedPRs,
        total: stats.pullRequests.length,
        page,
        limit,
      });
    }
  );

  /**
   * Compare multiple users
   * GET /api/v1/users/compare?users={user1,user2}
   */
  public compare = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const usersParam = req.query.users as string;
      const filter = this.getTimeFilter(req) as TimeFilter;

      if (!usersParam) {
        this.sendSuccess(res, { users: [] });
        return;
      }

      const usernames = usersParam
        .split(",")
        .map((u) => u.trim())
        .slice(0, 5);

      if (req.user?.accessToken) {
        this.gitHubService.setAuthToken(req.user.accessToken);
      }

      const comparisons = await Promise.all(
        usernames.map(async (username) => {
          try {
            const stats = await this.gitHubService.fetchUserStats(
              username,
              filter
            );
            return {
              username: stats.username,
              avatarUrl: stats.avatarUrl,
              totalStats: stats.totalStats,
              repositoryCount: Object.keys(stats.repositories).length,
            };
          } catch {
            return null;
          }
        })
      );

      this.sendSuccess(res, {
        users: comparisons.filter(Boolean),
      });
    }
  );
}

// Export singleton instance
export const userProfileController = new UserProfileController();
