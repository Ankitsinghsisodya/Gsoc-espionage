import { Request, Response } from "express";
import { GitHubService } from "../../application/services/GitHubService.js";
import { TimeFilter } from "../../core/entities/index.js";
import { GitHubUrlParser } from "../../shared/utils/GitHubUrlParser.js";
import { BaseController } from "./BaseController.js";

/**
 * Repository analysis controller
 * Handles repository statistics and PR data endpoints
 * @class RepositoryController
 * @extends {BaseController}
 */
export class RepositoryController extends BaseController {
  private gitHubService: GitHubService;

  /**
   * Create new RepositoryController instance
   */
  constructor() {
    super();
    this.gitHubService = new GitHubService();
  }

  /**
   * Analyze repository by URL
   * GET /api/v1/repos/analyze?url={repoUrl}&branch={branch}&filter={timeFilter}
   */
  public analyze = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const url = req.query.url as string;
      const branch = this.getBranch(req);
      const filter = this.getTimeFilter(req) as TimeFilter;

      // Set auth token if available
      if (req.user?.accessToken) {
        this.gitHubService.setAuthToken(req.user.accessToken);
      }

      const { owner, repo } = GitHubUrlParser.parse(url);
      const stats = await this.gitHubService.fetchRepositoryStats(
        owner,
        repo,
        branch,
        filter
      );

      this.sendSuccess(res, stats);
    }
  );

  /**
   * Get repository statistics
   * GET /api/v1/repos/:owner/:repo/stats
   */
  public getStats = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { owner, repo } = req.params;
      const branch = this.getBranch(req);
      const filter = this.getTimeFilter(req) as TimeFilter;

      if (req.user?.accessToken) {
        this.gitHubService.setAuthToken(req.user.accessToken);
      }

      const stats = await this.gitHubService.fetchRepositoryStats(
        owner,
        repo,
        branch,
        filter
      );

      this.sendSuccess(res, stats);
    }
  );

  /**
   * Get repository branches
   * GET /api/v1/repos/:owner/:repo/branches
   */
  public getBranches = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { owner, repo } = req.params;

      if (req.user?.accessToken) {
        this.gitHubService.setAuthToken(req.user.accessToken);
      }

      const branches = await this.gitHubService.fetchBranches(owner, repo);

      this.sendSuccess(res, { branches });
    }
  );

  /**
   * Get repository pull requests
   * GET /api/v1/repos/:owner/:repo/prs
   */
  public getPullRequests = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { owner, repo } = req.params;
      const branch = this.getBranch(req);
      const filter = this.getTimeFilter(req) as TimeFilter;
      const { page } = this.getPagination(req);

      if (req.user?.accessToken) {
        this.gitHubService.setAuthToken(req.user.accessToken);
      }

      const prs = await this.gitHubService.fetchPullRequests(
        owner,
        repo,
        branch,
        filter,
        page
      );

      this.sendSuccess(res, { pullRequests: prs, page });
    }
  );

  /**
   * Get repository contributors
   * GET /api/v1/repos/:owner/:repo/contributors
   */
  public getContributors = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { owner, repo } = req.params;
      const branch = this.getBranch(req);
      const filter = this.getTimeFilter(req) as TimeFilter;

      if (req.user?.accessToken) {
        this.gitHubService.setAuthToken(req.user.accessToken);
      }

      const contributors = await this.gitHubService.fetchContributors(
        owner,
        repo,
        branch,
        filter
      );

      this.sendSuccess(res, { contributors });
    }
  );
}

// Export singleton instance
export const repositoryController = new RepositoryController();
