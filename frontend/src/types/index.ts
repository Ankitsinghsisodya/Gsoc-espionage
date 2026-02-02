/**
 * Time filter options
 */
export type TimeFilter = "2w" | "1m" | "3m" | "6m" | "12m" | "all";

/**
 * Pull request interface
 */
export interface PullRequest {
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  htmlUrl: string;
  repositoryUrl: string;
  repositoryName: string;
  targetBranch: string;
  user: {
    login: string;
    avatarUrl: string;
  };
  labels: string[];
  additions: number;
  deletions: number;
  changedFiles: number;
  reviewComments: number;
  firstReviewAt: string | null;
}

/**
 * Contributor statistics
 */
export interface ContributorStats {
  username: string;
  avatarUrl: string;
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  closedPRs: number;
  isMaintainer: boolean;
  totalAdditions: number;
  totalDeletions: number;
  avgReviewTime: number;
  avgMergeTime: number;
}

/**
 * Activity data point for charts
 */
export interface ActivityDataPoint {
  date: string;
  opened: number;
  merged: number;
  closed: number;
}

/**
 * Review statistics
 */
export interface ReviewStats {
  totalReviews: number;
  avgTimeToFirstReview: number;
  avgTimeToMerge: number;
  topReviewers: ReviewerStats[];
}

/**
 * Reviewer statistics
 */
export interface ReviewerStats {
  username: string;
  avatarUrl: string;
  reviewCount: number;
  approvedCount: number;
  changesRequestedCount: number;
}

/**
 * Repository statistics
 */
export interface RepositoryStats {
  owner: string;
  repo: string;
  branch: string;
  timeFilter: TimeFilter;
  totalPRs: number;
  contributors: ContributorStats[];
  recentPRs: PullRequest[];
  labelDistribution: Record<string, number>;
  activityTimeline: ActivityDataPoint[];
  reviewStats: ReviewStats;
}

/**
 * Repository contribution
 */
export interface RepositoryContribution {
  fullName: string;
  prCount: number;
  mergedCount: number;
  isMaintainer: boolean;
}

/**
 * User profile statistics
 */
export interface UserProfileStats {
  username: string;
  avatarUrl: string;
  bio: string | null;
  location: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
  repositories: Record<string, RepositoryContribution>;
  pullRequests: PullRequest[];
  totalStats: {
    totalPRs: number;
    mergedPRs: number;
    openPRs: number;
    closedPRs: number;
  };
  maintainerRepos: string[];
}

/**
 * Bookmark
 */
export interface Bookmark {
  id: string;
  type: "repository" | "user";
  targetUrl: string;
  targetName: string;
  notes?: string;
  createdAt: string;
}

/**
 * Analysis history entry
 */
export interface AnalysisHistory {
  id: string;
  repositoryUrl: string;
  branch?: string;
  timeFilter: TimeFilter;
  analysisType: "repository" | "user";
  summary: {
    totalPRs: number;
    contributors: number;
    mergedPRs: number;
  };
  analyzedAt: string;
}

/**
 * Authenticated user
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  settings: UserSettings;
}

/**
 * User settings
 */
export interface UserSettings {
  theme: "light" | "dark";
  defaultTimeFilter: TimeFilter;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * API error response
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
