/**
 * @fileoverview GitHub URL parsing utilities.
 * Handles various GitHub URL formats and extracts repository information.
 * @module utils/urlParser
 */

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
 * Error thrown when a GitHub URL cannot be parsed.
 */
export class GitHubUrlParseError extends Error {
  constructor(message: string, public readonly originalUrl: string) {
    super(message);
    this.name = "GitHubUrlParseError";
  }
}

/**
 * GitHub URL parser utility.
 * Follows Single Responsibility Principle - only handles URL parsing.
 */
export const GitHubUrlParser = {
  /**
   * Parses a GitHub URL or shorthand notation to extract owner and repo.
   *
   * Supports multiple formats:
   * - Full URL: `https://github.com/owner/repo`
   * - SSH URL: `git@github.com:owner/repo.git`
   * - Shorthand: `owner/repo`
   * - With trailing slash: `https://github.com/owner/repo/`
   * - With .git suffix: `https://github.com/owner/repo.git`
   *
   * @param {string} url - The GitHub URL or shorthand to parse
   * @returns {ParsedGitHubUrl} Object containing owner and repo
   * @throws {GitHubUrlParseError} If the URL format is invalid
   *
   * @example
   * ```typescript
   * // Full URL
   * GitHubUrlParser.parse('https://github.com/facebook/react');
   * // Returns: { owner: 'facebook', repo: 'react' }
   *
   * // Shorthand
   * GitHubUrlParser.parse('facebook/react');
   * // Returns: { owner: 'facebook', repo: 'react' }
   * ```
   */
  parse(url: string): ParsedGitHubUrl {
    const cleanUrl = url.trim().replace(/\/$/, "");

    // Handle full HTTPS URL or github.com without protocol
    const githubMatch = cleanUrl.match(
      /(?:https?:\/\/)?github\.com\/([^\/]+)\/([^\/]+)/
    );
    if (githubMatch) {
      return {
        owner: githubMatch[1],
        repo: githubMatch[2].replace(".git", ""),
      };
    }

    // Handle SSH URL format
    const sshMatch = cleanUrl.match(/git@github\.com:([^\/]+)\/(.+)/);
    if (sshMatch) {
      return {
        owner: sshMatch[1],
        repo: sshMatch[2].replace(".git", ""),
      };
    }

    // Handle owner/repo shorthand format (must not contain github.com)
    if (
      !cleanUrl.includes("://") &&
      !cleanUrl.includes("@") &&
      !cleanUrl.includes("github.com")
    ) {
      const parts = cleanUrl.split("/");
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return {
          owner: parts[0],
          repo: parts[1].replace(".git", ""),
        };
      }
    }

    throw new GitHubUrlParseError(
      "Invalid GitHub URL format. Expected: owner/repo or https://github.com/owner/repo",
      url
    );
  },

  /**
   * Validates if a string is a valid GitHub URL or shorthand.
   *
   * @param {string} url - The URL to validate
   * @returns {boolean} True if the URL can be parsed successfully
   *
   * @example
   * ```typescript
   * GitHubUrlParser.isValid('facebook/react'); // true
   * GitHubUrlParser.isValid('not-a-url');      // false
   * ```
   */
  isValid(url: string): boolean {
    try {
      this.parse(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Constructs a full GitHub URL from owner and repo.
   *
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {string} Full GitHub URL
   *
   * @example
   * ```typescript
   * GitHubUrlParser.toUrl('facebook', 'react');
   * // Returns: 'https://github.com/facebook/react'
   * ```
   */
  toUrl(owner: string, repo: string): string {
    return `https://github.com/${owner}/${repo}`;
  },
};
