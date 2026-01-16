/**
 * @fileoverview GitHub URL parsing utilities.
 * Handles various GitHub URL formats and extracts repository information.
 * @module utils/urlParser
 */

// ============================================================================
// Constants & Patterns
// ============================================================================

/**
 * Valid characters for GitHub usernames and repository names.
 * GitHub allows alphanumeric characters, hyphens, underscores, and periods.
 */
const GITHUB_NAME_PATTERN = "[A-Za-z0-9_.-]+";

/**
 * Regex for simple "owner/repo" format.
 */
const SIMPLE_FORMAT_REGEX = new RegExp(
  `^${GITHUB_NAME_PATTERN}\\/${GITHUB_NAME_PATTERN}$`
);

/**
 * Regex for "github.com/owner/repo" format (without protocol).
 */
const DOMAIN_FORMAT_REGEX = new RegExp(
  `^github\\.com\\/${GITHUB_NAME_PATTERN}\\/${GITHUB_NAME_PATTERN}`
);

/**
 * Regex for SSH format: git@github.com:owner/repo.git
 */
const SSH_FORMAT_REGEX = new RegExp(
  `^git@github\\.com:(${GITHUB_NAME_PATTERN})\\/(${GITHUB_NAME_PATTERN})(?:\\.git)?$`
);

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Result of parsing a GitHub URL.
 */
export interface ParsedGitHubUrl {
  /** Repository owner (user or organization) */
  owner: string;
  /** Repository name */
  repo: string;
}

/**
 * Extended result including optional PR number.
 */
export interface ParsedGitHubPRUrl extends ParsedGitHubUrl {
  /** Pull request number, if present in URL */
  prNumber?: number;
}

/**
 * Error thrown when a GitHub URL cannot be parsed.
 */
export class GitHubUrlParseError extends Error {
  constructor(message: string, public readonly originalUrl: string) {
    super(message);
    this.name = "GitHubUrlParseError";
  }
}

// ============================================================================
// Core Parsing Functions
// ============================================================================

/**
 * Parses a GitHub URL and extracts owner and repo.
 *
 * Supports multiple formats:
 * - Simple: `owner/repo`
 * - Domain: `github.com/owner/repo`
 * - Full URL: `https://github.com/owner/repo`
 * - With .git: `https://github.com/owner/repo.git`
 * - SSH: `git@github.com:owner/repo.git`
 * - PR/Issue URLs: `https://github.com/owner/repo/pull/123`
 *
 * @param {string} url - The GitHub URL or shorthand to parse
 * @returns {{ owner: string; repo: string } | null} Parsed result or null if invalid
 *
 * @example
 * ```typescript
 * parseGitHubUrl('facebook/react');
 * // Returns: { owner: 'facebook', repo: 'react' }
 *
 * parseGitHubUrl('git@github.com:omegaup/omegaup.git');
 * // Returns: { owner: 'omegaup', repo: 'omegaup' }
 * ```
 */
export const parseGitHubUrl = (
  url: string
): { owner: string; repo: string } | null => {
  try {
    // Clean and normalize the input
    let normalizedUrl = url.trim();

    if (!normalizedUrl) {
      return null;
    }

    // Remove trailing slashes, .git extension (except for SSH format)
    if (!normalizedUrl.startsWith("git@")) {
      normalizedUrl = normalizedUrl.replace(/\.git\/?$/, "").replace(/\/$/, "");
    }

    // Case 1: SSH format (git@github.com:owner/repo.git)
    const sshMatch = normalizedUrl.match(SSH_FORMAT_REGEX);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    // Case 2: Simple "owner/repo" format
    if (SIMPLE_FORMAT_REGEX.test(normalizedUrl)) {
      const [owner, repo] = normalizedUrl.split("/");
      return { owner, repo };
    }

    // Case 3: github.com/owner/repo (without protocol)
    if (DOMAIN_FORMAT_REGEX.test(normalizedUrl)) {
      const parts = normalizedUrl.split("/");
      return { owner: parts[1], repo: parts[2] };
    }

    // Case 4: Add protocol if needed for URL parsing
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    // Parse as URL
    const urlObj = new URL(normalizedUrl);

    // Verify it's a GitHub URL
    if (!urlObj.hostname.endsWith("github.com")) {
      return null;
    }

    // Extract path components
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Need at least owner and repo
    if (pathParts.length < 2) {
      return null;
    }

    return {
      owner: pathParts[0],
      repo: pathParts[1],
    };
  } catch (err) {
    console.warn("Error parsing GitHub URL:", err, url);
    return null;
  }
};

/**
 * Extracts PR number from a GitHub PR URL.
 *
 * @param {string} url - GitHub PR URL
 * @returns {number | null} PR number or null if not a PR URL
 *
 * @example
 * ```typescript
 * extractPRNumber('https://github.com/facebook/react/pull/12345');
 * // Returns: 12345
 * ```
 */
export const extractPRNumber = (url: string): number | null => {
  try {
    const normalizedUrl = url.trim();
    const prMatch = normalizedUrl.match(/\/pull\/(\d+)/);
    if (prMatch) {
      return parseInt(prMatch[1], 10);
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * GitHub URL parser utility object.
 * Wraps parseGitHubUrl with error throwing for backwards compatibility.
 */
export const GitHubUrlParser = {
  /**
   * Parses a GitHub URL or shorthand notation to extract owner and repo.
   *
   * @param {string} url - The GitHub URL or shorthand to parse
   * @returns {ParsedGitHubUrl} Object containing owner and repo
   * @throws {GitHubUrlParseError} If the URL format is invalid
   */
  parse(url: string): ParsedGitHubUrl {
    const result = parseGitHubUrl(url);
    if (!result) {
      throw new GitHubUrlParseError(
        "Invalid GitHub URL format. Supported formats: owner/repo, https://github.com/owner/repo, https://github.com/owner/repo.git, or git@github.com:owner/repo.git",
        url
      );
    }
    return result;
  },

  /**
   * Validates if a string is a valid GitHub URL or shorthand.
   *
   * @param {string} url - The URL to validate
   * @returns {boolean} True if the URL can be parsed successfully
   */
  isValid(url: string): boolean {
    return parseGitHubUrl(url) !== null;
  },

  /**
   * Constructs a full GitHub URL from owner and repo.
   *
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {string} Full GitHub URL
   */
  toUrl(owner: string, repo: string): string {
    return `https://github.com/${owner}/${repo}`;
  },

  /**
   * Detects whether a GitHub URL points to a user profile or repository.
   *
   * User profile URLs: github.com/username (single path segment)
   * Repository URLs: github.com/owner/repo (two path segments)
   *
   * @param {string} url - The GitHub URL to analyze
   * @returns {{ type: 'user' | 'repo' | 'unknown', username?: string, owner?: string, repo?: string }}
   *
   * @example
   * ```typescript
   * GitHubUrlParser.detectUrlType('github.com/octocat');
   * // Returns: { type: 'user', username: 'octocat' }
   *
   * GitHubUrlParser.detectUrlType('facebook/react');
   * // Returns: { type: 'repo', owner: 'facebook', repo: 'react' }
   * ```
   */
  detectUrlType(url: string): {
    type: "user" | "repo" | "unknown";
    username?: string;
    owner?: string;
    repo?: string;
  } {
    try {
      let normalizedUrl = url.trim();

      if (!normalizedUrl) {
        return { type: "unknown" };
      }

      // Remove trailing slashes and .git extension
      normalizedUrl = normalizedUrl.replace(/\.git\/?$/, "").replace(/\/$/, "");

      // Check for SSH format (always a repo)
      if (SSH_FORMAT_REGEX.test(normalizedUrl)) {
        const match = normalizedUrl.match(SSH_FORMAT_REGEX);
        if (match) {
          return { type: "repo", owner: match[1], repo: match[2] };
        }
      }

      // Check for simple owner/repo format (two segments = repo)
      if (SIMPLE_FORMAT_REGEX.test(normalizedUrl)) {
        const [owner, repo] = normalizedUrl.split("/");
        return { type: "repo", owner, repo };
      }

      // Check for single segment (username only)
      const singleSegmentRegex = new RegExp(`^${GITHUB_NAME_PATTERN}$`);
      if (singleSegmentRegex.test(normalizedUrl)) {
        return { type: "user", username: normalizedUrl };
      }

      // Check for github.com/username (single path segment = user)
      const userUrlRegex = new RegExp(
        `^(?:https?://)?github\\.com/(${GITHUB_NAME_PATTERN})/?$`
      );
      const userMatch = normalizedUrl.match(userUrlRegex);
      if (userMatch) {
        return { type: "user", username: userMatch[1] };
      }

      // Check for github.com/owner/repo... (two+ path segments = repo)
      if (!normalizedUrl.startsWith("http")) {
        normalizedUrl = "https://" + normalizedUrl;
      }

      const urlObj = new URL(normalizedUrl);
      if (!urlObj.hostname.endsWith("github.com")) {
        return { type: "unknown" };
      }

      const pathParts = urlObj.pathname.split("/").filter(Boolean);

      if (pathParts.length === 1) {
        // Single path = user profile
        return { type: "user", username: pathParts[0] };
      } else if (pathParts.length >= 2) {
        // Two+ paths = repository
        return { type: "repo", owner: pathParts[0], repo: pathParts[1] };
      }

      return { type: "unknown" };
    } catch (err) {
      console.warn("Error detecting URL type:", err, url);
      return { type: "unknown" };
    }
  },
};
