/**
 * User domain entity representing an authenticated user
 * @interface IUser
 */
export interface IUser {
  /** Unique identifier */
  id: string;
  /** GitHub user ID */
  githubId?: string;
  /** Google user ID */
  googleId?: string;
  /** Username */
  username: string;
  /** Email address */
  email?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** OAuth access token (encrypted) */
  accessToken?: string;
  /** OAuth refresh token */
  refreshToken?: string;
  /** Token expiration date */
  tokenExpiresAt?: Date;
  /** User settings */
  settings: IUserSettings;
  /** Account creation date */
  createdAt: Date;
  /** Last login date */
  lastLoginAt?: Date;
}

/**
 * User settings entity
 * @interface IUserSettings
 */
export interface IUserSettings {
  /** UI theme preference */
  theme: "light" | "dark";
  /** Default time filter */
  defaultTimeFilter: TimeFilter;
}

/**
 * Time filter options for PR queries
 * @type TimeFilter
 */
export type TimeFilter = "2w" | "1m" | "3m" | "6m" | "all";

/**
 * Pull request domain entity
 * @interface IPullRequest
 */
export interface IPullRequest {
  /** PR number */
  number: number;
  /** PR title */
  title: string;
  /** PR state */
  state: "open" | "closed";
  /** Whether PR was merged */
  merged: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Merge timestamp if merged */
  mergedAt: string | null;
  /** Close timestamp if closed */
  closedAt: string | null;
  /** GitHub PR URL */
  htmlUrl: string;
  /** Repository URL */
  repositoryUrl: string;
  /** Repository name */
  repositoryName: string;
  /** Target branch */
  targetBranch: string;
  /** PR author */
  user: {
    login: string;
    avatarUrl: string;
  };
  /** PR labels */
  labels: string[];
  /** Lines added */
  additions: number;
  /** Lines deleted */
  deletions: number;
  /** Number of files changed */
  changedFiles: number;
  /** Number of review comments */
  reviewComments: number;
  /** First review timestamp */
  firstReviewAt: string | null;
}

/**
 * Contributor statistics entity
 * @interface IContributorStats
 */
export interface IContributorStats {
  /** GitHub username */
  username: string;
  /** Avatar URL */
  avatarUrl: string;
  /** Total PRs created */
  totalPRs: number;
  /** Merged PRs count */
  mergedPRs: number;
  /** Open PRs count */
  openPRs: number;
  /** Closed (not merged) PRs count */
  closedPRs: number;
  /** Whether user is a maintainer */
  isMaintainer: boolean;
  /** Total lines added */
  totalAdditions: number;
  /** Total lines deleted */
  totalDeletions: number;
  /** Average time to first review (hours) */
  avgReviewTime: number;
  /** Average time to merge (hours) */
  avgMergeTime: number;
}

/**
 * Repository statistics entity
 * @interface IRepositoryStats
 */
export interface IRepositoryStats {
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Branch analyzed */
  branch: string;
  /** Time filter applied */
  timeFilter: TimeFilter;
  /** Total PRs in period */
  totalPRs: number;
  /** Contributor statistics list */
  contributors: IContributorStats[];
  /** Recent PRs list */
  recentPRs: IPullRequest[];
  /** Label distribution */
  labelDistribution: Record<string, number>;
  /** Activity timeline data */
  activityTimeline: IActivityDataPoint[];
  /** Review statistics */
  reviewStats: IReviewStats;
}

/**
 * Activity data point for timeline charts
 * @interface IActivityDataPoint
 */
export interface IActivityDataPoint {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Number of PRs opened */
  opened: number;
  /** Number of PRs merged */
  merged: number;
  /** Number of PRs closed */
  closed: number;
}

/**
 * Review statistics entity
 * @interface IReviewStats
 */
export interface IReviewStats {
  /** Total reviews given */
  totalReviews: number;
  /** Average time to first review (hours) */
  avgTimeToFirstReview: number;
  /** Average time to merge (hours) */
  avgTimeToMerge: number;
  /** Top reviewers */
  topReviewers: IReviewerStats[];
}

/**
 * Reviewer statistics
 * @interface IReviewerStats
 */
export interface IReviewerStats {
  /** Reviewer username */
  username: string;
  /** Avatar URL */
  avatarUrl: string;
  /** Total reviews given */
  reviewCount: number;
  /** Approved PRs count */
  approvedCount: number;
  /** Requested changes count */
  changesRequestedCount: number;
}

/**
 * User profile statistics entity
 * @interface IUserProfileStats
 */
export interface IUserProfileStats {
  /** GitHub username */
  username: string;
  /** Avatar URL */
  avatarUrl: string;
  /** User bio */
  bio: string | null;
  /** User location */
  location: string | null;
  /** Public repositories count */
  publicRepos: number;
  /** Followers count */
  followers: number;
  /** Following count */
  following: number;
  /** Account creation date */
  createdAt: string;
  /** Repository contributions */
  repositories: Record<string, IRepositoryContribution>;
  /** All user PRs */
  pullRequests: IPullRequest[];
  /** Total statistics */
  totalStats: {
    totalPRs: number;
    mergedPRs: number;
    openPRs: number;
    closedPRs: number;
  };
  /** Repositories where user is maintainer */
  maintainerRepos: string[];
}

/**
 * Repository contribution data
 * @interface IRepositoryContribution
 */
export interface IRepositoryContribution {
  /** Repository full name (owner/repo) */
  fullName: string;
  /** PRs in this repository */
  prCount: number;
  /** Merged PRs in this repository */
  mergedCount: number;
  /** Whether user is maintainer of this repo */
  isMaintainer: boolean;
}

/**
 * Bookmark entity
 * @interface IBookmark
 */
export interface IBookmark {
  /** Unique identifier */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Bookmark type */
  type: "repository" | "user";
  /** Target URL */
  targetUrl: string;
  /** Target display name */
  targetName: string;
  /** Optional notes */
  notes?: string;
  /** Creation date */
  createdAt: Date;
}

/**
 * Analysis history entry
 * @interface IAnalysisHistory
 */
export interface IAnalysisHistory {
  /** Unique identifier */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Repository URL analyzed */
  repositoryUrl: string;
  /** Branch analyzed */
  branch?: string;
  /** Time filter used */
  timeFilter: TimeFilter;
  /** Analysis type */
  analysisType: "repository" | "user";
  /** Summary data */
  summary: {
    totalPRs: number;
    contributors: number;
    mergedPRs: number;
  };
  /** Analysis timestamp */
  analyzedAt: Date;
}
