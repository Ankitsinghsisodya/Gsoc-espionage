import {
  IContributorStats,
  IPullRequest,
  IRepositoryStats,
  IUser,
  IUserProfileStats,
  TimeFilter,
} from "../entities/index.js";

/**
 * OAuth authentication result
 * @interface AuthResult
 */
export interface AuthResult {
  /** Authenticated user */
  user: IUser;
  /** Session ID */
  sessionId: string;
  /** Access token */
  accessToken: string;
}

/**
 * Token refresh result
 * @interface TokenResult
 */
export interface TokenResult {
  /** New access token */
  accessToken: string;
  /** New refresh token if provided */
  refreshToken?: string;
  /** Token expiration date */
  expiresAt: Date;
}

/**
 * OAuth provider interface - all OAuth providers must implement this
 * Implements Interface Segregation Principle (ISP) by keeping the interface focused
 * @interface IOAuthProvider
 */
export interface IOAuthProvider {
  /**
   * Get the OAuth authorization URL for redirecting users
   * @param {string} state - CSRF protection state
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(state: string): string;

  /**
   * Handle OAuth callback and exchange code for tokens
   * @param {string} code - Authorization code from OAuth provider
   * @returns {Promise<AuthResult>} Authentication result with user and tokens
   */
  handleCallback(code: string): Promise<AuthResult>;

  /**
   * Refresh an expired access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<TokenResult>} New token pair
   */
  refreshToken(refreshToken: string): Promise<TokenResult>;

  /**
   * Revoke access token on logout
   * @param {string} accessToken - Access token to revoke
   * @returns {Promise<void>}
   */
  revokeToken(accessToken: string): Promise<void>;

  /**
   * Get the provider name
   * @returns {string} Provider name (e.g., 'github', 'google')
   */
  getProviderName(): string;
}

/**
 * Cache service interface - all cache implementations must implement this
 * Follows Dependency Inversion Principle (DIP)
 * @interface ICacheService
 */
export interface ICacheService {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<T | null>} Cached value or null
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {T} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<void>}
   */
  set<T>(key: string, value: T, ttl: number): Promise<void>;

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  delete(key: string): Promise<void>;

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get or fetch data - returns cached value or fetches and caches
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if cache miss
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<T>} Cached or fetched value
   */
  getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<T>;

  /**
   * Flush all cached data
   * @returns {Promise<void>}
   */
  flush(): Promise<void>;
}

/**
 * GitHub service interface - defines GitHub API operations
 * Follows Interface Segregation Principle (ISP)
 * @interface IGitHubService
 */
export interface IGitHubService {
  /**
   * Fetch repository statistics including PRs and contributors
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Target branch filter
   * @param {TimeFilter} timeFilter - Time period filter
   * @returns {Promise<IRepositoryStats>}
   */
  fetchRepositoryStats(
    owner: string,
    repo: string,
    branch: string,
    timeFilter: TimeFilter
  ): Promise<IRepositoryStats>;

  /**
   * Fetch repository branches
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<string[]>} List of branch names
   */
  fetchBranches(owner: string, repo: string): Promise<string[]>;

  /**
   * Fetch maintainers with push/admin access
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Set<string>>} Set of maintainer usernames
   */
  fetchMaintainers(owner: string, repo: string): Promise<Set<string>>;

  /**
   * Fetch pull requests with filters
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Target branch filter
   * @param {TimeFilter} timeFilter - Time period filter
   * @param {number} page - Page number for pagination
   * @returns {Promise<IPullRequest[]>} List of pull requests
   */
  fetchPullRequests(
    owner: string,
    repo: string,
    branch: string,
    timeFilter: TimeFilter,
    page?: number
  ): Promise<IPullRequest[]>;

  /**
   * Fetch contributors for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Target branch filter
   * @param {TimeFilter} timeFilter - Time period filter
   * @returns {Promise<IContributorStats[]>} List of contributor statistics
   */
  fetchContributors(
    owner: string,
    repo: string,
    branch: string,
    timeFilter: TimeFilter
  ): Promise<IContributorStats[]>;

  /**
   * Fetch user profile and statistics
   * @param {string} username - GitHub username
   * @param {TimeFilter} timeFilter - Time period filter
   * @returns {Promise<IUserProfileStats>}
   */
  fetchUserStats(
    username: string,
    timeFilter: TimeFilter
  ): Promise<IUserProfileStats>;

  /**
   * Set authentication token for API requests
   * @param {string} token - GitHub access token
   */
  setAuthToken(token: string): void;

  /**
   * Get current rate limit status
   * @returns {Promise<{ remaining: number; reset: Date }>}
   */
  getRateLimitStatus(): Promise<{ remaining: number; reset: Date }>;
}

/**
 * Generic repository interface for data access
 * Implements Repository Pattern
 * @interface IRepository
 */
export interface IRepository<T> {
  /**
   * Find entity by ID
   * @param {string} id - Entity ID
   * @returns {Promise<T | null>}
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities matching filter
   * @param {object} filter - Filter criteria
   * @returns {Promise<T[]>}
   */
  findAll(filter?: object): Promise<T[]>;

  /**
   * Create new entity
   * @param {Partial<T>} data - Entity data
   * @returns {Promise<T>}
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Update entity by ID
   * @param {string} id - Entity ID
   * @param {Partial<T>} data - Updated data
   * @returns {Promise<T | null>}
   */
  update(id: string, data: Partial<T>): Promise<T | null>;

  /**
   * Delete entity by ID
   * @param {string} id - Entity ID
   * @returns {Promise<boolean>}
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Export strategy interface - implements Strategy Pattern
 * @interface IExportStrategy
 */
export interface IExportStrategy {
  /**
   * Export data to specific format
   * @param {IRepositoryStats | IUserProfileStats} data - Data to export
   * @returns {Promise<Buffer>} Exported data buffer
   */
  export(data: IRepositoryStats | IUserProfileStats): Promise<Buffer>;

  /**
   * Get content type for HTTP response
   * @returns {string} MIME content type
   */
  getContentType(): string;

  /**
   * Get file extension
   * @returns {string} File extension (e.g., '.csv')
   */
  getFileExtension(): string;
}

/**
 * User repository interface
 * @interface IUserRepository
 */
export interface IUserRepository extends IRepository<IUser> {
  /**
   * Find user by GitHub ID
   * @param {string} githubId - GitHub user ID
   * @returns {Promise<IUser | null>}
   */
  findByGithubId(githubId: string): Promise<IUser | null>;

  /**
   * Find user by Google ID
   * @param {string} googleId - Google user ID
   * @returns {Promise<IUser | null>}
   */
  findByGoogleId(googleId: string): Promise<IUser | null>;

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<IUser | null>}
   */
  findByUsername(username: string): Promise<IUser | null>;

  /**
   * Update user's last login timestamp
   * @param {string} id - User ID
   * @returns {Promise<void>}
   */
  updateLastLogin(id: string): Promise<void>;
}
