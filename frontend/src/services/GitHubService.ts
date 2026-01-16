/**
 * @fileoverview GitHub API Service for fetching repository and user data.
 * Provides direct browser-client access to GitHub's REST API v3.
 *
 * @module services/GitHubService
 * @description
 * This service handles all GitHub API interactions from the browser.
 * Each user gets their own rate limit based on authentication status:
 * - Unauthenticated: 60 requests/hour
 * - With Personal Access Token: 5,000 requests/hour
 *
 * @example
 * ```typescript
 * import { GitHubService } from './services';
 *
 * // Fetch repository statistics
 * const stats = await GitHubService.fetchRepositoryStats(
 *   'facebook/react',
 *   'main',
 *   '1m'
 * );
 * ```
 */

import { GITHUB_API_CONFIG, STORAGE_KEYS } from "../constants";
import {
  ActivityDataPoint,
  ContributorStats,
  PullRequest,
  RepositoryContribution,
  RepositoryStats,
  ReviewStats,
  TimeFilter,
  UserProfileStats,
} from "../types";
import { DateUtils, GitHubUrlParser } from "../utils";
import { CACHE_TTL, CacheService } from "./CacheService";

/**
 * GitHub API Error with additional context.
 * @extends Error
 */
export class GitHubApiError extends Error {
  /**
   * Creates a new GitHubApiError.
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {string} [endpoint] - The API endpoint that failed
   */
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint?: string
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

/**
 * Rate limit exceeded error with reset time information.
 * @extends GitHubApiError
 */
export class RateLimitError extends GitHubApiError {
  /**
   * Creates a new RateLimitError.
   * @param {Date} resetTime - When the rate limit will reset
   */
  constructor(public readonly resetTime: Date) {
    super(
      `GitHub API rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`,
      403
    );
    this.name = "RateLimitError";
  }
}

/**
 * GitHub Service Class - Core API integration layer.
 *
 * @class GitHubServiceClass
 * @description
 * Implements the Repository pattern for GitHub API access.
 * Follows Single Responsibility Principle - only handles GitHub API operations.
 *
 * Design Principles:
 * - Singleton pattern for consistent state management
 * - Error handling with custom error types
 * - Token management with localStorage persistence
 * - Pagination handling for large datasets
 */
class GitHubServiceClass {
  /** @private Cached personal access token */
  private token: string | null = null;

  /**
   * Initializes the service and loads any stored token.
   */
  constructor() {
    this.loadToken();
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Loads the personal access token from localStorage.
   * Called on initialization and before each request to ensure token is current.
   * @private
   */
  private loadToken(): void {
    try {
      this.token = localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN);
    } catch {
      this.token = null;
    }
  }

  /**
   * Constructs request headers with optional authentication.
   * @private
   * @returns {HeadersInit} Headers object with Accept and optional Authorization
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
    };

    // Reload token in case it was updated in another tab/window
    this.loadToken();

    if (this.token) {
      headers.Authorization = `token ${this.token}`;
    }

    return headers;
  }

  // ============================================================================
  // Core HTTP Methods
  // ============================================================================

  /**
   * Makes an authenticated request to the GitHub API.
   *
   * @private
   * @template T - The expected response type
   * @param {string} endpoint - API endpoint (e.g., '/repos/owner/repo')
   * @returns {Promise<T>} Parsed JSON response
   * @throws {RateLimitError} When rate limit is exceeded
   * @throws {GitHubApiError} For other API errors
   *
   * @example
   * ```typescript
   * const data = await this.request<Repository[]>('/users/octocat/repos');
   * ```
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${GITHUB_API_CONFIG.BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get(
          "x-ratelimit-remaining"
        );
        if (rateLimitRemaining === "0") {
          const resetTime = response.headers.get("x-ratelimit-reset");
          const resetDate = resetTime
            ? new Date(parseInt(resetTime) * 1000)
            : new Date();
          throw new RateLimitError(resetDate);
        }
      }

      // Handle not found
      if (response.status === 404) {
        throw new GitHubApiError("Repository not found", 404, endpoint);
      }

      // Generic error
      throw new GitHubApiError(
        `GitHub API error: ${response.status}`,
        response.status,
        endpoint
      );
    }

    return response.json();
  }

  // ============================================================================
  // Public API - URL Parsing
  // ============================================================================

  /**
   * Parses a GitHub repository URL into owner and repo components.
   *
   * @param {string} url - GitHub URL or shorthand (e.g., 'owner/repo')
   * @returns {{ owner: string; repo: string }} Parsed components
   * @throws {GitHubUrlParseError} If URL format is invalid
   *
   * @example
   * ```typescript
   * const { owner, repo } = GitHubService.parseUrl('https://github.com/facebook/react');
   * // owner: 'facebook', repo: 'react'
   * ```
   */
  public parseUrl(url: string): { owner: string; repo: string } {
    return GitHubUrlParser.parse(url);
  }

  // ============================================================================
  // Public API - Repository Operations
  // ============================================================================

  /**
   * Fetches comprehensive statistics for a GitHub repository.
   *
   * @param {string} url - Repository URL or shorthand
   * @param {string} branch - Branch to filter PRs by (empty for all branches)
   * @param {TimeFilter} timeFilter - Time period to analyze
   * @returns {Promise<RepositoryStats>} Complete repository statistics
   * @throws {GitHubApiError} On API errors
   *
   * @example
   * ```typescript
   * const stats = await GitHubService.fetchRepositoryStats(
   *   'facebook/react',
   *   'main',
   *   '3m'
   * );
   * console.log(`Total PRs: ${stats.totalPRs}`);
   * ```
   */
  public async fetchRepositoryStats(
    url: string,
    branch: string,
    timeFilter: TimeFilter
  ): Promise<RepositoryStats> {
    const { owner, repo } = this.parseUrl(url);
    const cacheKey = CacheService.generateKey(
      "repo_stats",
      owner,
      repo,
      branch || "all",
      timeFilter
    );

    // Check cache first
    const cached = CacheService.get<RepositoryStats>(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] Repository stats for ${owner}/${repo}`);
      return cached;
    }

    console.log(`[Cache MISS] Fetching repository stats for ${owner}/${repo}`);

    // Fetch PRs with pagination
    const prs = await this.fetchPullRequests(owner, repo, branch, timeFilter);

    // Calculate aggregated statistics
    const contributors = this.calculateContributorStats(prs);
    const labelDistribution = this.calculateLabelDistribution(prs);
    const activityTimeline = this.calculateActivityTimeline(prs, timeFilter);

    // Review stats placeholder (would require additional API calls)
    const reviewStats: ReviewStats = {
      totalReviews: 0,
      avgTimeToFirstReview: 0,
      avgTimeToMerge: 0,
      topReviewers: [],
    };

    const result: RepositoryStats = {
      owner,
      repo,
      branch,
      timeFilter,
      totalPRs: prs.length,
      contributors: contributors.sort((a, b) => b.totalPRs - a.totalPRs),
      recentPRs: prs,
      labelDistribution,
      activityTimeline,
      reviewStats,
    };

    // Cache the result
    CacheService.set(cacheKey, result, CACHE_TTL.REPO_STATS);
    return result;
  }

  /**
   * Fetches available branches for a repository.
   *
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<string[]>} Array of branch names
   *
   * @example
   * ```typescript
   * const branches = await GitHubService.fetchBranches('facebook', 'react');
   * // ['main', 'canary', 'experimental', ...]
   * ```
   */
  public async fetchBranches(owner: string, repo: string): Promise<string[]> {
    const cacheKey = CacheService.generateKey("branches", owner, repo);

    // Check cache first
    const cached = CacheService.get<string[]>(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] Branches for ${owner}/${repo}`);
      return cached;
    }

    try {
      const branches: string[] = [];
      let page = 1;
      const maxPages = 3; // Limit to prevent excessive requests

      while (page <= maxPages) {
        const data = await this.request<Array<{ name: string }>>(
          `/repos/${owner}/${repo}/branches?per_page=100&page=${page}`
        );

        branches.push(...data.map((b) => b.name));

        if (data.length < 100) break;
        page++;
      }

      // Cache the result
      CacheService.set(cacheKey, branches, CACHE_TTL.BRANCHES);
      return branches;
    } catch (error) {
      console.error("Failed to fetch branches:", error);
      return [];
    }
  }

  // ============================================================================
  // Public API - User Operations
  // ============================================================================

  /**
   * Fetches user profile and contribution statistics.
   *
   * @param {string} username - GitHub username
   * @param {TimeFilter} timeFilter - Time period for PR analysis
   * @returns {Promise<UserProfileStats>} User profile with PR statistics
   * @throws {GitHubApiError} On API errors
   *
   * @example
   * ```typescript
   * const userStats = await GitHubService.fetchUserStats('octocat', '6m');
   * console.log(`${userStats.username} has ${userStats.totalStats.totalPRs} PRs`);
   * ```
   */
  public async fetchUserStats(
    username: string,
    timeFilter: TimeFilter
  ): Promise<UserProfileStats> {
    const cacheKey = CacheService.generateKey(
      "user_stats",
      username.toLowerCase(),
      timeFilter
    );

    // Check cache first
    const cached = CacheService.get<UserProfileStats>(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] User stats for ${username}`);
      return cached;
    }

    console.log(`[Cache MISS] Fetching user stats for ${username}`);

    // Fetch user profile
    const user = await this.request<{
      login: string;
      avatar_url: string;
      bio: string | null;
      location: string | null;
      public_repos: number;
      followers: number;
      following: number;
      created_at: string;
    }>(`/users/${username}`);

    // Search for user's PRs
    const prs = await this.searchUserPullRequests(username, timeFilter);

    // Calculate per-repository contributions
    const repositories = this.calculateRepositoryContributions(prs);

    // Calculate totals
    const totalStats = {
      totalPRs: prs.length,
      mergedPRs: prs.filter((pr) => pr.merged).length,
      openPRs: prs.filter((pr) => pr.state === "open").length,
      closedPRs: prs.filter((pr) => pr.state === "closed" && !pr.merged).length,
    };

    const result: UserProfileStats = {
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

    // Cache the result
    CacheService.set(cacheKey, result, CACHE_TTL.USER_PROFILE);
    return result;
  }

  /**
   * Gets current GitHub API rate limit status.
   *
   * @returns {Promise<{ remaining: number; limit: number; reset: Date }>}
   *          Current rate limit information
   *
   * @example
   * ```typescript
   * const { remaining, limit, reset } = await GitHubService.getRateLimitStatus();
   * console.log(`${remaining}/${limit} requests remaining`);
   * ```
   */
  public async getRateLimitStatus(): Promise<{
    remaining: number;
    limit: number;
    reset: Date;
  }> {
    try {
      const response = await fetch(`${GITHUB_API_CONFIG.BASE_URL}/rate_limit`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to get rate limit");
      }

      const data = await response.json();
      return {
        remaining: data.rate.remaining,
        limit: data.rate.limit,
        reset: new Date(data.rate.reset * 1000),
      };
    } catch {
      // Return default unauthenticated limits on error
      return { remaining: 60, limit: 60, reset: new Date() };
    }
  }

  // ============================================================================
  // Private Helpers - Data Fetching
  // ============================================================================

  /**
   * Fetches pull requests with pagination support.
   * @private
   */
  private async fetchPullRequests(
    owner: string,
    repo: string,
    branch: string,
    timeFilter: TimeFilter
  ): Promise<PullRequest[]> {
    const startDate = DateUtils.getStartDate(timeFilter);
    const allPRs: PullRequest[] = [];
    let page = 1;

    try {
      while (
        page <= GITHUB_API_CONFIG.MAX_PAGES &&
        allPRs.length < GITHUB_API_CONFIG.MAX_PRS
      ) {
        const baseParam = branch ? `&base=${branch}` : "";
        const data = await this.request<any[]>(
          `/repos/${owner}/${repo}/pulls?state=all&sort=created&direction=desc&per_page=${GITHUB_API_CONFIG.PER_PAGE}&page=${page}${baseParam}`
        );

        if (data.length === 0) break;

        // Filter by date and transform
        const filteredPRs = data
          .filter((pr) => new Date(pr.created_at) >= startDate)
          .map((pr) => this.mapPullRequest(pr, owner, repo));

        allPRs.push(...filteredPRs);

        // Stop if we got less than per_page or oldest PR is before startDate
        if (data.length < GITHUB_API_CONFIG.PER_PAGE) break;

        const oldestPR = new Date(data[data.length - 1].created_at);
        if (oldestPR < startDate) break;

        page++;
      }

      return allPRs;
    } catch (error) {
      console.error("Failed to fetch pull requests:", error);
      throw error;
    }
  }

  /**
   * Searches for user's pull requests across all repositories.
   * @private
   */
  private async searchUserPullRequests(
    username: string,
    timeFilter: TimeFilter
  ): Promise<PullRequest[]> {
    const startDate = DateUtils.getStartDate(timeFilter);
    const dateStr = DateUtils.toDateString(startDate);
    const query = `author:${username} is:pr created:>=${dateStr}`;

    const prs: PullRequest[] = [];
    let page = 1;
    const maxPages = 5;

    while (page <= maxPages && prs.length < 500) {
      const searchResult = await this.request<{ items: any[] }>(
        `/search/issues?q=${encodeURIComponent(
          query
        )}&per_page=100&page=${page}&sort=created&order=desc`
      );

      if (searchResult.items.length === 0) break;

      for (const item of searchResult.items) {
        prs.push(this.mapSearchResultToPR(item, username));
      }

      if (searchResult.items.length < 100) break;
      page++;
    }

    return prs;
  }

  // ============================================================================
  // Private Helpers - Data Transformation
  // ============================================================================

  /**
   * Maps GitHub API pull request response to internal PullRequest type.
   * @private
   */
  private mapPullRequest(pr: any, owner: string, repo: string): PullRequest {
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
   * Maps search API result to PullRequest type.
   * @private
   */
  private mapSearchResultToPR(item: any, username: string): PullRequest {
    const urlParts = item.repository_url?.split("/") || [];
    const owner = urlParts[urlParts.length - 2] || "";
    const repo = urlParts[urlParts.length - 1] || "";

    return {
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
        item.labels?.map((l: any) =>
          typeof l === "string" ? l : l.name || ""
        ) || [],
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      reviewComments: 0,
      firstReviewAt: null,
    };
  }

  // ============================================================================
  // Private Helpers - Statistics Calculation
  // ============================================================================

  /**
   * Calculates per-contributor statistics from pull requests.
   * @private
   */
  private calculateContributorStats(prs: PullRequest[]): ContributorStats[] {
    const statsMap = new Map<string, ContributorStats>();

    for (const pr of prs) {
      const { login: username } = pr.user;

      if (!statsMap.has(username)) {
        statsMap.set(username, {
          username,
          avatarUrl: pr.user.avatarUrl,
          totalPRs: 0,
          mergedPRs: 0,
          openPRs: 0,
          closedPRs: 0,
          isMaintainer: false,
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
   * Calculates label distribution from pull requests.
   * @private
   */
  private calculateLabelDistribution(
    prs: PullRequest[]
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
   * Calculates daily activity timeline from pull requests.
   * @private
   */
  private calculateActivityTimeline(
    prs: PullRequest[],
    timeFilter: TimeFilter
  ): ActivityDataPoint[] {
    const dateRange = DateUtils.generateDateRange(timeFilter);
    const timeline = new Map<string, ActivityDataPoint>();

    // Initialize all dates with zero counts
    for (const date of dateRange) {
      timeline.set(date, { date, opened: 0, merged: 0, closed: 0 });
    }

    // Aggregate PR counts per day
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
   * Calculates per-repository contribution statistics.
   * @private
   */
  private calculateRepositoryContributions(
    prs: PullRequest[]
  ): Record<string, RepositoryContribution> {
    const repositories: Record<string, RepositoryContribution> = {};

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
      if (pr.merged) {
        repositories[repoName].mergedCount++;
      }
    }

    return repositories;
  }
}

// Export singleton instance
export const GitHubService = new GitHubServiceClass();
