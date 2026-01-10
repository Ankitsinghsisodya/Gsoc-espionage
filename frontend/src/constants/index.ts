/**
 * @fileoverview Application constants and configuration values.
 * Centralizes magic numbers and configuration for maintainability.
 * @module constants
 */

/**
 * GitHub API configuration constants.
 * These values are tuned for optimal performance while respecting rate limits.
 */
export const GITHUB_API_CONFIG = {
  /** Base URL for GitHub REST API v3 */
  BASE_URL: "https://api.github.com",

  /** Number of items to fetch per API page (max 100 per GitHub docs) */
  PER_PAGE: 100,

  /** Maximum number of pages to fetch to prevent runaway requests */
  MAX_PAGES: 10,

  /** Maximum number of PRs to analyze (performance guard) */
  MAX_PRS: 500,

  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 30000,
} as const;

/**
 * Rate limit thresholds for user feedback.
 */
export const RATE_LIMIT_CONFIG = {
  /** Requests per hour for unauthenticated users */
  UNAUTHENTICATED: 60,

  /** Requests per hour for authenticated users */
  AUTHENTICATED: 5000,

  /** Warning threshold (percentage of limit remaining) */
  WARNING_THRESHOLD: 0.1,
} as const;

/**
 * Local storage keys for persistence.
 * Centralized to prevent key conflicts and typos.
 */
export const STORAGE_KEYS = {
  /** User's GitHub personal access token */
  GITHUB_TOKEN: "github_personal_token",

  /** Recent analyses list */
  RECENT_ANALYSES: "recent_analyses",

  /** User theme preference */
  THEME: "theme",

  /** Bookmarked repositories */
  BOOKMARKS: "pr_analyzer_bookmarks",

  /** Analysis history */
  HISTORY: "pr_analyzer_history",
} as const;

/**
 * Time filter options with labels.
 */
export const TIME_FILTER_OPTIONS = [
  { value: "2w", label: "2 weeks" },
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "all", label: "All time" },
] as const;

/**
 * Pagination defaults.
 */
export const PAGINATION_CONFIG = {
  /** Default page size for history */
  DEFAULT_PAGE_SIZE: 20,

  /** Maximum bookmarks to store */
  MAX_BOOKMARKS: 100,

  /** Maximum history entries to store */
  MAX_HISTORY: 50,

  /** Maximum recent analyses to display */
  MAX_RECENT: 10,
} as const;

/**
 * UI animation durations in milliseconds.
 */
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;
