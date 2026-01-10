import { ValidationError } from "../../core/errors/index.js";

/**
 * Parsed GitHub repository information
 * @interface ParsedRepo
 */
export interface ParsedRepo {
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
}

/**
 * GitHub URL parser utility class
 * Supports multiple URL formats: owner/repo, github.com/owner/repo, https://github.com/owner/repo
 * @class GitHubUrlParser
 */
export class GitHubUrlParser {
  /** Regular expressions for different URL formats */
  private static readonly PATTERNS = {
    // Full URL: https://github.com/owner/repo or http://github.com/owner/repo
    fullUrl: /^https?:\/\/(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)\/?$/i,

    // Short URL: github.com/owner/repo
    shortUrl: /^(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)\/?$/i,

    // Simple format: owner/repo
    simple: /^([^\/]+)\/([^\/]+)$/,

    // GitHub API URL: https://api.github.com/repos/owner/repo
    apiUrl: /^https?:\/\/api\.github\.com\/repos\/([^\/]+)\/([^\/]+)\/?$/i,
  };

  /**
   * Parse a GitHub repository URL or identifier
   * @param {string} input - GitHub URL or owner/repo string
   * @returns {ParsedRepo} Parsed owner and repo
   * @throws {ValidationError} If input format is invalid
   */
  public static parse(input: string): ParsedRepo {
    if (!input || typeof input !== "string") {
      throw new ValidationError("Repository URL or identifier is required");
    }

    const trimmedInput = input.trim();

    // Remove trailing .git if present
    const cleanInput = trimmedInput.replace(/\.git$/, "");

    // Try each pattern
    for (const [, pattern] of Object.entries(GitHubUrlParser.PATTERNS)) {
      const match = cleanInput.match(pattern);
      if (match) {
        const owner = match[1];
        const repo = match[2];

        // Validate owner and repo names
        GitHubUrlParser.validateNames(owner, repo);

        return { owner, repo };
      }
    }

    throw new ValidationError(
      "Invalid GitHub repository format. Use: owner/repo, github.com/owner/repo, or https://github.com/owner/repo",
      { input: trimmedInput }
    );
  }

  /**
   * Validate owner and repository names
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @throws {ValidationError} If names are invalid
   */
  private static validateNames(owner: string, repo: string): void {
    // GitHub username/org rules: alphanumeric with hyphens, no consecutive hyphens, no leading/trailing hyphens
    const ownerPattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    if (!ownerPattern.test(owner)) {
      throw new ValidationError(`Invalid repository owner: ${owner}`);
    }

    // GitHub repo name rules: alphanumeric with hyphens, underscores, and dots
    const repoPattern = /^[a-zA-Z0-9._-]+$/;
    if (!repoPattern.test(repo)) {
      throw new ValidationError(`Invalid repository name: ${repo}`);
    }

    // Maximum lengths
    if (owner.length > 39) {
      throw new ValidationError(
        "Repository owner name too long (max 39 characters)"
      );
    }
    if (repo.length > 100) {
      throw new ValidationError(
        "Repository name too long (max 100 characters)"
      );
    }
  }

  /**
   * Build GitHub URL from owner and repo
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {string} Full GitHub URL
   */
  public static buildUrl(owner: string, repo: string): string {
    return `https://github.com/${owner}/${repo}`;
  }

  /**
   * Build GitHub API URL from owner and repo
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {string} GitHub API URL
   */
  public static buildApiUrl(owner: string, repo: string): string {
    return `https://api.github.com/repos/${owner}/${repo}`;
  }

  /**
   * Check if input looks like a GitHub URL
   * @param {string} input - Input string
   * @returns {boolean} Whether input appears to be a GitHub URL
   */
  public static isGitHubUrl(input: string): boolean {
    try {
      GitHubUrlParser.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract owner/repo string from any format
   * @param {string} input - GitHub URL or identifier
   * @returns {string} owner/repo format
   */
  public static toShortFormat(input: string): string {
    const { owner, repo } = GitHubUrlParser.parse(input);
    return `${owner}/${repo}`;
  }
}
