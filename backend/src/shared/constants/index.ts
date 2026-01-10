/**
 * Application constants
 * @module constants
 */

/**
 * Cache TTL values in seconds
 */
export const CACHE_TTL = {
  /** Session cache: 24 hours */
  SESSION: 86400,
  /** General data cache: 5 minutes */
  GENERAL: 300,
  /** Maintainer list cache: 1 hour */
  MAINTAINER: 3600,
  /** Branches cache: 30 minutes */
  BRANCHES: 1800,
  /** User profile cache: 10 minutes */
  USER_PROFILE: 600,
  /** Repository stats cache: 5 minutes */
  REPO_STATS: 300,
} as const;

/**
 * Cache key builders
 */
export const CACHE_KEYS = {
  /** Session key */
  session: (id: string): string => `session:${id}`,

  /** Repository stats key */
  repoStats: (
    owner: string,
    repo: string,
    branch: string,
    filter: string
  ): string => `repo:${owner}:${repo}:${branch || "all"}:${filter}`,

  /** User stats key */
  userStats: (username: string, filter: string): string =>
    `user:${username}:${filter}`,

  /** Maintainers key */
  maintainers: (owner: string, repo: string): string =>
    `maintainers:${owner}:${repo}`,

  /** Branches key */
  branches: (owner: string, repo: string): string =>
    `branches:${owner}:${repo}`,

  /** Rate limit key */
  rateLimit: (identifier: string): string => `ratelimit:${identifier}`,
} as const;

/**
 * GitHub API constants
 */
export const GITHUB_API = {
  /** Base GitHub API URL */
  BASE_URL: "https://api.github.com",
  /** Default items per page */
  PER_PAGE: 100,
  /** Maximum pages to fetch for PRs */
  MAX_PAGES: 5,
  /** Maximum PRs to analyze */
  MAX_PRS: 500,
} as const;

/**
 * Time filter options
 */
export const TIME_FILTERS = ["2w", "1m", "3m", "6m", "all"] as const;

/**
 * PR states
 */
export const PR_STATES = {
  OPEN: "open",
  CLOSED: "closed",
  MERGED: "merged",
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMIT: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
