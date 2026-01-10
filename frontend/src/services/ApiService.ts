import axios, { AxiosError, AxiosInstance } from "axios";
import {
  AnalysisHistory,
  ApiError,
  ApiResponse,
  Bookmark,
  ContributorStats,
  PullRequest,
  RepositoryStats,
  TimeFilter,
  User,
  UserProfileStats,
} from "../types";

/**
 * API Service class for backend communication
 * @class ApiService
 */
class ApiServiceClass {
  private client: AxiosInstance;
  private token: string | null = null;

  /**
   * Create new ApiService instance
   */
  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          this.clearAuth();
          window.location.href = "/";
        }
        return Promise.reject(error);
      }
    );

    // Load token from storage
    this.loadToken();
  }

  /**
   * Load token from localStorage
   */
  private loadToken(): void {
    const token = localStorage.getItem("auth_token");
    if (token) {
      this.token = token;
    }
  }

  /**
   * Set authentication token
   */
  public setAuth(token: string): void {
    this.token = token;
    localStorage.setItem("auth_token", token);
  }

  /**
   * Clear authentication
   */
  public clearAuth(): void {
    this.token = null;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("session_id");
  }

  // ============================================
  // Repository Analysis
  // ============================================

  /**
   * Analyze repository
   */
  public async analyzeRepository(
    url: string,
    branch: string = "",
    filter: TimeFilter = "1m"
  ): Promise<RepositoryStats> {
    const params = new URLSearchParams({ url, filter });
    if (branch) params.set("branch", branch);

    const response = await this.client.get<ApiResponse<RepositoryStats>>(
      `/api/v1/repos/analyze?${params}`
    );
    return response.data.data;
  }

  /**
   * Get repository branches
   */
  public async getBranches(owner: string, repo: string): Promise<string[]> {
    const response = await this.client.get<ApiResponse<{ branches: string[] }>>(
      `/api/v1/repos/${owner}/${repo}/branches`
    );
    return response.data.data.branches;
  }

  /**
   * Get repository pull requests
   */
  public async getPullRequests(
    owner: string,
    repo: string,
    branch: string = "",
    filter: TimeFilter = "1m",
    page: number = 1
  ): Promise<{ pullRequests: PullRequest[]; page: number }> {
    const params = new URLSearchParams({ filter, page: page.toString() });
    if (branch) params.set("branch", branch);

    const response = await this.client.get<
      ApiResponse<{ pullRequests: PullRequest[]; page: number }>
    >(`/api/v1/repos/${owner}/${repo}/prs?${params}`);
    return response.data.data;
  }

  /**
   * Get repository contributors
   */
  public async getContributors(
    owner: string,
    repo: string,
    branch: string = "",
    filter: TimeFilter = "1m"
  ): Promise<ContributorStats[]> {
    const params = new URLSearchParams({ filter });
    if (branch) params.set("branch", branch);

    const response = await this.client.get<
      ApiResponse<{ contributors: ContributorStats[] }>
    >(`/api/v1/repos/${owner}/${repo}/contributors?${params}`);
    return response.data.data.contributors;
  }

  // ============================================
  // User Profile
  // ============================================

  /**
   * Get user profile
   */
  public async getUserProfile(
    username: string,
    filter: TimeFilter = "1m"
  ): Promise<UserProfileStats> {
    const response = await this.client.get<ApiResponse<UserProfileStats>>(
      `/api/v1/users/${username}/profile?filter=${filter}`
    );
    return response.data.data;
  }

  /**
   * Compare users
   */
  public async compareUsers(
    usernames: string[],
    filter: TimeFilter = "1m"
  ): Promise<{ username: string; avatarUrl: string; totalStats: any }[]> {
    const response = await this.client.get<ApiResponse<{ users: any[] }>>(
      `/api/v1/users/compare?users=${usernames.join(",")}&filter=${filter}`
    );
    return response.data.data.users;
  }

  // ============================================
  // Bookmarks
  // ============================================

  /**
   * Get bookmarks
   */
  public async getBookmarks(type?: "repository" | "user"): Promise<Bookmark[]> {
    const params = type ? `?type=${type}` : "";
    const response = await this.client.get<
      ApiResponse<{ bookmarks: Bookmark[] }>
    >(`/api/v1/bookmarks${params}`);
    return response.data.data.bookmarks;
  }

  /**
   * Add bookmark
   */
  public async addBookmark(
    type: "repository" | "user",
    targetUrl: string,
    targetName: string,
    notes?: string
  ): Promise<Bookmark> {
    const response = await this.client.post<
      ApiResponse<{ bookmark: Bookmark }>
    >("/api/v1/bookmarks", { type, targetUrl, targetName, notes });
    return response.data.data.bookmark;
  }

  /**
   * Delete bookmark
   */
  public async deleteBookmark(id: string): Promise<void> {
    await this.client.delete(`/api/v1/bookmarks/${id}`);
  }

  // ============================================
  // History
  // ============================================

  /**
   * Get analysis history
   */
  public async getHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    history: AnalysisHistory[];
    total: number;
    page: number;
    pages: number;
  }> {
    const response = await this.client.get<
      ApiResponse<{
        history: AnalysisHistory[];
        total: number;
        page: number;
        pages: number;
      }>
    >(`/api/v1/history?page=${page}&limit=${limit}`);
    return response.data.data;
  }

  /**
   * Delete history entry
   */
  public async deleteHistoryEntry(id: string): Promise<void> {
    await this.client.delete(`/api/v1/history/${id}`);
  }

  /**
   * Clear all history
   */
  public async clearHistory(): Promise<void> {
    await this.client.delete("/api/v1/history");
  }

  // ============================================
  // Authentication
  // ============================================

  /**
   * Get current user
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.client.get<
        ApiResponse<{ user: User | null }>
      >("/auth/me");
      return response.data.data.user;
    } catch {
      return null;
    }
  }

  /**
   * Logout
   */
  public async logout(): Promise<void> {
    try {
      await this.client.post("/auth/logout");
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Get GitHub OAuth URL
   */
  public getGitHubAuthUrl(): string {
    return `${this.client.defaults.baseURL}/auth/github`;
  }

  /**
   * Get Google OAuth URL
   */
  public getGoogleAuthUrl(): string {
    return `${this.client.defaults.baseURL}/auth/google`;
  }

  // ============================================
  // Export
  // ============================================

  /**
   * Export as CSV
   */
  public async exportCsv(
    url: string,
    branch: string = "",
    filter: TimeFilter = "1m"
  ): Promise<Blob> {
    const params = new URLSearchParams({ url, filter });
    if (branch) params.set("branch", branch);

    const response = await this.client.get(`/api/v1/export/csv?${params}`, {
      responseType: "blob",
    });
    return response.data;
  }

  /**
   * Export as JSON
   */
  public async exportJson(
    url: string,
    branch: string = "",
    filter: TimeFilter = "1m"
  ): Promise<Blob> {
    const params = new URLSearchParams({ url, filter });
    if (branch) params.set("branch", branch);

    const response = await this.client.get(`/api/v1/export/json?${params}`, {
      responseType: "blob",
    });
    return response.data;
  }

  /**
   * Export as PDF
   */
  public async exportPdf(
    url: string,
    branch: string = "",
    filter: TimeFilter = "1m"
  ): Promise<Blob> {
    const response = await this.client.post(
      "/api/v1/export/pdf",
      { url, branch, filter },
      { responseType: "blob" }
    );
    return response.data;
  }
}

// Export singleton instance
export const ApiService = new ApiServiceClass();
