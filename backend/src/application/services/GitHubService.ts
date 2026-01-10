import { Octokit } from "octokit";
import {
  IActivityDataPoint,
  IContributorStats,
  IPullRequest,
  IRepositoryContribution,
  IRepositoryStats,
  IReviewStats,
  IUserProfileStats,
  TimeFilter,
} from "../../core/entities/index.js";
import { GitHubApiError, RateLimitError } from "../../core/errors/index.js";
import { ICacheService, IGitHubService } from "../../core/interfaces/index.js";
import { CacheService } from "../../infrastructure/cache/RedisCacheService.js";
import {
  CACHE_KEYS,
  CACHE_TTL,
  GITHUB_API,
} from "../../shared/constants/index.js";
import { DateUtils, Logger } from "../../shared/utils/index.js";

/**
 * GitHub API service for fetching repository and PR data
 * Implements IGitHubService interface following DIP
 * @class GitHubService
 * @implements {IGitHubService}
 */
export class GitHubService implements IGitHubService {
  private octokit: Octokit;
  private cacheService: ICacheService;
  private authToken: string | null = null;

  /**
   * Create a new GitHubService instance
   * @param {string} token - Optional GitHub access token
   */
  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token,
    });
    this.authToken = token || null;
    this.cacheService = CacheService;
  }

  /**
   * Set authentication token for API requests
   * @param {string} token - GitHub access token
   */
  public setAuthToken(token: string): void {
    this.authToken = token;
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Get current rate limit status
   * @returns {Promise<{ remaining: number; reset: Date }>}
   */
  public async getRateLimitStatus(): Promise<{
    remaining: number;
    reset: Date;
  }> {
    try {
      const { data } = await this.octokit.rest.rateLimit.get();
      return {
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000),
      };
    } catch (error) {
      Logger.error("Failed to get rate limit status", error as Error);
      return { remaining: 0, reset: new Date() };
    }
  }

  /**
   * Fetch repository statistics including PRs and contributors
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Target branch filter
   * @param {TimeFilter} timeFilter - Time period filter
   * @returns {Promise<IRepositoryStats>}
   */
  public async fetchRepositoryStats(
    owner: string,
    repo: string,
    branch: string,
    timeFilter: TimeFilter
  ): Promise<IRepositoryStats> {
    const cacheKey = CACHE_KEYS.repoStats(owner, repo, branch, timeFilter);

    return this.cacheService.getOrFetch(
      cacheKey,
      async () => {
        Logger.info(`Fetching repository stats for ${owner}/${repo}`, {
          branch,
          timeFilter,
        });

        // Fetch PRs
        const prs = await this.fetchPullRequests(
          owner,
          repo,
          branch,
          timeFilter
        );

        // Fetch maintainers
        const maintainers = await this.fetchMaintainers(owner, repo);

        // Calculate contributor stats
        const contributors = this.calculateContributorStats(prs, maintainers);

        // Calculate label distribution
        const labelDistribution = this.calculateLabelDistribution(prs);

        // Calculate activity timeline
        const activityTimeline = this.calculateActivityTimeline(
          prs,
          timeFilter
        );

        // Calculate review stats
        const reviewStats = await this.calculateReviewStats(prs);

        return {
          owner,
          repo,
          branch,
          timeFilter,
          totalPRs: prs.length,
          contributors: contributors.sort((a, b) => b.totalPRs - a.totalPRs),
          recentPRs: prs.slice(0, 50),
          labelDistribution,
          activityTimeline,
          reviewStats,
        };
      },
      CACHE_TTL.REPO_STATS
    );
  }

  /**
   * Fetch repository branches
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<string[]>} List of branch names
   */
  public async fetchBranches(owner: string, repo: string): Promise<string[]> {
    const cacheKey = CACHE_KEYS.branches(owner, repo);

    return this.cacheService.getOrFetch(
      cacheKey,
      async () => {
        try {
          const branches: string[] = [];
          let page = 1;

          while (page <= 3) {
            // Limit to 3 pages
            const { data } = await this.octokit.rest.repos.listBranches({
              owner,
              repo,
              per_page: 100,
              page,
            });

            branches.push(...data.map((b) => b.name));

            if (data.length < 100) break;
            page++;
          }

          return branches;
        } catch (error) {
          this.handleGitHubError(error);
          return [];
        }
      },
      CACHE_TTL.BRANCHES
    );
  }

  /**
   * Fetch maintainers with push/admin access
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Set<string>>} Set of maintainer usernames
   */
  public async fetchMaintainers(
    owner: string,
    repo: string
  ): Promise<Set<string>> {
    const cacheKey = CACHE_KEYS.maintainers(owner, repo);

    const maintainersList = await this.cacheService.getOrFetch(
      cacheKey,
      async () => {
        try {
          const { data: collaborators } =
            await this.octokit.rest.repos.listCollaborators({
              owner,
              repo,
              per_page: 100,
            });

          return collaborators
            .filter((c) => c.permissions?.push || c.permissions?.admin)
            .map((c) => c.login);
        } catch (error) {
          // May fail for non-collaborators - this is expected
          Logger.debug(`Could not fetch collaborators for ${owner}/${repo}`);
          return [];
        }
      },
      CACHE_TTL.MAINTAINER
    );

    return new Set(maintainersList);
  }

  /**
   * Fetch pull requests with filters
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Target branch filter
   * @param {TimeFilter} timeFilter - Time period filter
   * @param {number} page - Page number for pagination
   * @returns {Promise<IPullRequest[]>} List of pull requests
   */
  public async fetchPullRequests(
    owner: string,
    repo: string,
    branch: string,
    timeFilter: TimeFilter,
    page: number = 1
  ): Promise<IPullRequest[]> {
    const startDate = DateUtils.getStartDate(timeFilter);
    const allPRs: IPullRequest[] = [];
    let currentPage = page;

    try {
      while (
        currentPage <= GITHUB_API.MAX_PAGES &&
        allPRs.length < GITHUB_API.MAX_PRS
      ) {
        const { data } = await this.octokit.rest.pulls.list({
          owner,
          repo,
          state: "all",
          base: branch || undefined,
          sort: "created",
          direction: "desc",
          per_page: GITHUB_API.PER_PAGE,
          page: currentPage,
        });

        if (data.length === 0) break;

        // Filter by date
        const filteredPRs = data.filter((pr) => {
          const prDate = new Date(pr.created_at);
          return prDate >= startDate;
        });

        // Map to our interface
        const mappedPRs = filteredPRs.map((pr) =>
          this.mapPullRequest(pr, owner, repo)
        );
        allPRs.push(...mappedPRs);

        // If we got less than per_page or oldest PR is before startDate, stop
        if (data.length < GITHUB_API.PER_PAGE) break;

        const oldestPR = new Date(data[data.length - 1].created_at);
        if (oldestPR < startDate) break;

        currentPage++;
      }

      return allPRs;
    } catch (error) {
      this.handleGitHubError(error);
      return [];
    }
  }

  /**
   * Fetch contributors for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Target branch filter
   * @param {TimeFilter} timeFilter - Time period filter
   * @returns {Promise<IContributorStats[]>} List of contributor statistics
   */
  public async fetchContributors(
    owner: string,
    repo: string,
    branch: string,
    timeFilter: TimeFilter
  ): Promise<IContributorStats[]> {
    const prs = await this.fetchPullRequests(owner, repo, branch, timeFilter);
    const maintainers = await this.fetchMaintainers(owner, repo);
    return this.calculateContributorStats(prs, maintainers);
  }

  /**
   * Fetch user profile and statistics
   * @param {string} username - GitHub username
   * @param {TimeFilter} timeFilter - Time period filter
   * @returns {Promise<IUserProfileStats>}
   */
  public async fetchUserStats(
    username: string,
    timeFilter: TimeFilter
  ): Promise<IUserProfileStats> {
    const cacheKey = CACHE_KEYS.userStats(username, timeFilter);

    return this.cacheService.getOrFetch(
      cacheKey,
      async () => {
        Logger.info(`Fetching user stats for ${username}`, { timeFilter });

        try {
          // Fetch user profile
          const { data: user } = await this.octokit.rest.users.getByUsername({
            username,
          });

          // Fetch user's PRs using search API
          const startDate = DateUtils.getStartDate(timeFilter);
          const query = `author:${username} is:pr created:>=${DateUtils.toDateString(
            startDate
          )}`;

          const prs: IPullRequest[] = [];
          let page = 1;

          while (page <= 5 && prs.length < 500) {
            const { data: searchResult } =
              await this.octokit.rest.search.issuesAndPullRequests({
                q: query,
                per_page: 100,
                page,
                sort: "created",
                order: "desc",
              });

            if (searchResult.items.length === 0) break;

            for (const item of searchResult.items) {
              // Extract owner/repo from repository_url
              const urlParts = item.repository_url?.split("/") || [];
              const owner = urlParts[urlParts.length - 2] || "";
              const repo = urlParts[urlParts.length - 1] || "";

              prs.push({
                number: item.number,
                title: item.title,
                state: item.state as "open" | "closed",
                merged: item.pull_request?.merged_at !== null,
                createdAt: item.created_at,
                mergedAt: item.pull_request?.merged_at || null,
                closedAt: item.closed_at,
                htmlUrl: item.html_url,
                repositoryUrl: item.repository_url || "",
                repositoryName: `${owner}/${repo}`,
                targetBranch: "",
                user: {
                  login: item.user?.login || username,
                  avatarUrl: item.user?.avatar_url || "",
                },
                labels:
                  item.labels?.map((l) =>
                    typeof l === "string" ? l : l.name || ""
                  ) || [],
                additions: 0,
                deletions: 0,
                changedFiles: 0,
                reviewComments: 0,
                firstReviewAt: null,
              });
            }

            if (searchResult.items.length < 100) break;
            page++;
          }

          // Calculate repository contributions
          const repositories: Record<string, IRepositoryContribution> = {};
          for (const pr of prs) {
            const repoName = pr.repositoryName;
            if (!repositories[repoName]) {
              repositories[repoName] = {
                fullName: repoName,
                prCount: 0,
                mergedCount: 0,
                isMaintainer: false,
              };
            }
            repositories[repoName].prCount++;
            if (pr.merged) repositories[repoName].mergedCount++;
          }

          // Calculate totals
          const totalStats = {
            totalPRs: prs.length,
            mergedPRs: prs.filter((pr) => pr.merged).length,
            openPRs: prs.filter((pr) => pr.state === "open").length,
            closedPRs: prs.filter((pr) => pr.state === "closed" && !pr.merged)
              .length,
          };

          return {
            username: user.login,
            avatarUrl: user.avatar_url,
            bio: user.bio,
            location: user.location,
            publicRepos: user.public_repos,
            followers: user.followers,
            following: user.following,
            createdAt: user.created_at,
            repositories,
            pullRequests: prs,
            totalStats,
            maintainerRepos: [],
          };
        } catch (error) {
          this.handleGitHubError(error);
          throw error;
        }
      },
      CACHE_TTL.USER_PROFILE
    );
  }

  /**
   * Map GitHub PR response to our interface
   */
  private mapPullRequest(pr: any, owner: string, repo: string): IPullRequest {
    return {
      number: pr.number,
      title: pr.title,
      state: pr.state as "open" | "closed",
      merged: pr.merged_at !== null,
      createdAt: pr.created_at,
      mergedAt: pr.merged_at,
      closedAt: pr.closed_at,
      htmlUrl: pr.html_url,
      repositoryUrl: `https://github.com/${owner}/${repo}`,
      repositoryName: `${owner}/${repo}`,
      targetBranch: pr.base?.ref || "",
      user: {
        login: pr.user?.login || "unknown",
        avatarUrl: pr.user?.avatar_url || "",
      },
      labels: pr.labels?.map((l: any) => l.name) || [],
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changedFiles: pr.changed_files || 0,
      reviewComments: pr.review_comments || 0,
      firstReviewAt: null,
    };
  }

  /**
   * Calculate contributor statistics from PRs
   */
  private calculateContributorStats(
    prs: IPullRequest[],
    maintainers: Set<string>
  ): IContributorStats[] {
    const statsMap = new Map<string, IContributorStats>();

    for (const pr of prs) {
      const username = pr.user.login;

      if (!statsMap.has(username)) {
        statsMap.set(username, {
          username,
          avatarUrl: pr.user.avatarUrl,
          totalPRs: 0,
          mergedPRs: 0,
          openPRs: 0,
          closedPRs: 0,
          isMaintainer: maintainers.has(username),
          totalAdditions: 0,
          totalDeletions: 0,
          avgReviewTime: 0,
          avgMergeTime: 0,
        });
      }

      const stats = statsMap.get(username)!;
      stats.totalPRs++;
      stats.totalAdditions += pr.additions;
      stats.totalDeletions += pr.deletions;

      if (pr.merged) {
        stats.mergedPRs++;
      } else if (pr.state === "open") {
        stats.openPRs++;
      } else {
        stats.closedPRs++;
      }
    }

    return Array.from(statsMap.values());
  }

  /**
   * Calculate label distribution from PRs
   */
  private calculateLabelDistribution(
    prs: IPullRequest[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const pr of prs) {
      for (const label of pr.labels) {
        distribution[label] = (distribution[label] || 0) + 1;
      }
    }

    return distribution;
  }

  /**
   * Calculate activity timeline from PRs
   */
  private calculateActivityTimeline(
    prs: IPullRequest[],
    timeFilter: TimeFilter
  ): IActivityDataPoint[] {
    const dateRange = DateUtils.generateDateRange(timeFilter);
    const timeline: Map<string, IActivityDataPoint> = new Map();

    // Initialize all dates
    for (const date of dateRange) {
      timeline.set(date, { date, opened: 0, merged: 0, closed: 0 });
    }

    // Count PRs per day
    for (const pr of prs) {
      const createdDate = DateUtils.toDateString(new Date(pr.createdAt));
      if (timeline.has(createdDate)) {
        timeline.get(createdDate)!.opened++;
      }

      if (pr.mergedAt) {
        const mergedDate = DateUtils.toDateString(new Date(pr.mergedAt));
        if (timeline.has(mergedDate)) {
          timeline.get(mergedDate)!.merged++;
        }
      } else if (pr.closedAt) {
        const closedDate = DateUtils.toDateString(new Date(pr.closedAt));
        if (timeline.has(closedDate)) {
          timeline.get(closedDate)!.closed++;
        }
      }
    }

    return Array.from(timeline.values());
  }

  /**
   * Calculate review statistics (placeholder - would need additional API calls)
   */
  private async calculateReviewStats(
    prs: IPullRequest[]
  ): Promise<IReviewStats> {
    // Simplified version - full implementation would fetch reviews for each PR
    return {
      totalReviews: 0,
      avgTimeToFirstReview: 0,
      avgTimeToMerge: 0,
      topReviewers: [],
    };
  }

  /**
   * Handle GitHub API errors
   */
  private handleGitHubError(error: any): never {
    if (
      error?.status === 403 &&
      error?.response?.headers?.["x-ratelimit-remaining"] === "0"
    ) {
      const resetTime = new Date(
        parseInt(error.response.headers["x-ratelimit-reset"]) * 1000
      );
      throw new RateLimitError("GitHub API rate limit exceeded", resetTime);
    }

    if (error?.status === 404) {
      throw new GitHubApiError("Repository or user not found", 404, error);
    }

    if (error?.status === 401) {
      throw new GitHubApiError("Invalid or expired GitHub token", 401, error);
    }

    throw new GitHubApiError(
      error?.message || "GitHub API error",
      error?.status || 500,
      error
    );
  }
}

// Export factory function for DI
export const createGitHubService = (token?: string): IGitHubService => {
  return new GitHubService(token);
};
