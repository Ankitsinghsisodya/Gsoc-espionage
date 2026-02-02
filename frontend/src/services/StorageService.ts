/**
 * @fileoverview Storage service for local data persistence.
 * Manages bookmarks and analysis history using localStorage.
 *
 * @module services/StorageService
 * @description
 * Provides CRUD operations for locally stored data including:
 * - Repository and user bookmarks
 * - Analysis history with pagination
 *
 * All data is persisted in localStorage and survives page refreshes.
 * Implements data size limits to prevent localStorage quota issues.
 *
 * @example
 * ```typescript
 * import { StorageService } from './services';
 *
 * // Add a bookmark
 * StorageService.addBookmark('repository', 'facebook/react', 'React');
 *
 * // Get paginated history
 * const { history, page, pages } = StorageService.getHistory(1, 10);
 * ```
 */

import { PAGINATION_CONFIG, STORAGE_KEYS } from "../constants";
import { AnalysisHistory, Bookmark, TimeFilter } from "../types";

/**
 * Bookmark already exists error.
 * @extends Error
 */
export class BookmarkExistsError extends Error {
  constructor(public readonly targetUrl: string) {
    super("Bookmark already exists");
    this.name = "BookmarkExistsError";
  }
}

/**
 * Paginated response type for history queries.
 */
export interface PaginatedHistory {
  /** History entries for the current page */
  history: AnalysisHistory[];
  /** Total number of entries across all pages */
  total: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  pages: number;
}

/**
 * Storage Service Class - Local persistence layer.
 *
 * @class StorageServiceClass
 * @description
 * Implements the Repository pattern for localStorage access.
 * Provides type-safe storage operations with error handling.
 *
 * Data Limits:
 * - Bookmarks: Maximum 100 entries
 * - History: Maximum 50 entries
 * - Recent analyses: Maximum 10 entries
 */
class StorageServiceClass {
  // ============================================================================
  // Bookmark Operations
  // ============================================================================

  /**
   * Retrieves all bookmarks, optionally filtered by type.
   *
   * @param {('repository' | 'user')} [type] - Filter by bookmark type
   * @returns {Bookmark[]} Array of bookmarks, sorted by creation date (newest first)
   *
   * @example
   * ```typescript
   * // Get all bookmarks
   * const all = StorageService.getBookmarks();
   *
   * // Get only repository bookmarks
   * const repos = StorageService.getBookmarks('repository');
   * ```
   */
  public getBookmarks(type?: "repository" | "user"): Bookmark[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      const bookmarks: Bookmark[] = data ? JSON.parse(data) : [];

      if (type) {
        return bookmarks.filter((bookmark) => bookmark.type === type);
      }

      return bookmarks;
    } catch {
      return [];
    }
  }

  /**
   * Adds a new bookmark. Prevents duplicates based on target URL.
   *
   * @param {('repository' | 'user')} type - Type of bookmark
   * @param {string} targetUrl - URL being bookmarked
   * @param {string} targetName - Display name for the bookmark
   * @param {string} [notes] - Optional user notes
   * @returns {Bookmark} The created bookmark
   * @throws {BookmarkExistsError} If bookmark for URL already exists
   *
   * @example
   * ```typescript
   * const bookmark = StorageService.addBookmark(
   *   'repository',
   *   'https://github.com/facebook/react',
   *   'facebook/react',
   *   'Main UI library'
   * );
   * ```
   */
  public addBookmark(
    type: "repository" | "user",
    targetUrl: string,
    targetName: string,
    notes?: string,
  ): Bookmark {
    const bookmarks = this.getBookmarks();

    // Check for existing bookmark
    const existing = bookmarks.find(
      (bookmark) => bookmark.targetUrl === targetUrl,
    );
    if (existing) {
      throw new BookmarkExistsError(targetUrl);
    }

    const bookmark: Bookmark = {
      id: this.generateId(),
      type,
      targetUrl,
      targetName,
      notes,
      createdAt: new Date().toISOString(),
    };

    // Add to front, limit total count
    bookmarks.unshift(bookmark);
    this.saveBookmarks(bookmarks.slice(0, PAGINATION_CONFIG.MAX_BOOKMARKS));

    return bookmark;
  }

  /**
   * Deletes a bookmark by ID.
   *
   * @param {string} id - Bookmark ID to delete
   * @returns {void}
   *
   * @example
   * ```typescript
   * StorageService.deleteBookmark('bookmark_123');
   * ```
   */
  public deleteBookmark(id: string): void {
    const bookmarks = this.getBookmarks();
    const filtered = bookmarks.filter((bookmark) => bookmark.id !== id);
    this.saveBookmarks(filtered);
  }

  // ============================================================================
  // History Operations
  // ============================================================================

  /**
   * Retrieves paginated analysis history.
   *
   * @param {number} [page=1] - Page number (1-indexed)
   * @param {number} [limit=20] - Items per page
   * @returns {PaginatedHistory} Paginated history with metadata
   *
   * @example
   * ```typescript
   * const { history, page, pages, total } = StorageService.getHistory(1, 10);
   * console.log(`Showing ${history.length} of ${total} entries`);
   * ```
   */
  public getHistory(page: number = 1, limit: number = 20): PaginatedHistory {
    try {
      const allHistory = this.getAllHistory();
      const start = (page - 1) * limit;
      const paginatedHistory = allHistory.slice(start, start + limit);

      return {
        history: paginatedHistory,
        total: allHistory.length,
        page,
        pages: Math.ceil(allHistory.length / limit),
      };
    } catch {
      return { history: [], total: 0, page: 1, pages: 0 };
    }
  }

  /**
   * Adds an analysis to history. Updates existing entry if URL matches.
   *
   * @param {string} repositoryUrl - Repository URL analyzed
   * @param {('repository' | 'user')} analysisType - Type of analysis
   * @param {{ totalPRs: number; contributors: number; mergedPRs: number }} summary - Analysis summary
   * @param {string} [branch] - Branch analyzed (if applicable)
   * @param {TimeFilter} [timeFilter='1m'] - Time filter used
   * @returns {AnalysisHistory} The created history entry
   *
   * @example
   * ```typescript
   * StorageService.addHistory(
   *   'https://github.com/facebook/react',
   *   'repository',
   *   { totalPRs: 150, contributors: 45, mergedPRs: 120 },
   *   'main',
   *   '3m'
   * );
   * ```
   */
  public addHistory(
    repositoryUrl: string,
    analysisType: "repository" | "user",
    summary: { totalPRs: number; contributors: number; mergedPRs: number },
    branch?: string,
    timeFilter: TimeFilter = "1m",
  ): AnalysisHistory {
    const history = this.getAllHistory();

    const entry: AnalysisHistory = {
      id: this.generateId(),
      repositoryUrl,
      branch,
      timeFilter,
      analysisType,
      summary,
      analyzedAt: new Date().toISOString(),
    };

    // Remove existing entry for same URL (will be re-added at front)
    const filtered = history.filter(
      (item) => item.repositoryUrl !== repositoryUrl,
    );
    filtered.unshift(entry);

    this.saveHistory(filtered.slice(0, PAGINATION_CONFIG.MAX_HISTORY));

    return entry;
  }

  /**
   * Deletes a single history entry by ID.
   *
   * @param {string} id - History entry ID to delete
   * @returns {void}
   */
  public deleteHistoryEntry(id: string): void {
    const history = this.getAllHistory();
    const filtered = history.filter((item) => item.id !== id);
    this.saveHistory(filtered);
  }

  /**
   * Clears all analysis history.
   *
   * @returns {void}
   *
   * @example
   * ```typescript
   * StorageService.clearHistory();
   * ```
   */
  public clearHistory(): void {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  }

  // ============================================================================
  // Recent Searches Operations (for autocomplete)
  // ============================================================================

  /**
   * Retrieves recent search queries for autocomplete.
   *
   * @param {string} [filterPrefix] - Optional prefix to filter searches (case-insensitive)
   * @returns {string[]} Array of recent search queries, newest first
   *
   * @example
   * ```typescript
   * // Get all recent searches
   * const searches = StorageService.getRecentSearches();
   *
   * // Get searches matching a prefix
   * const filtered = StorageService.getRecentSearches('facebook');
   * ```
   */
  public getRecentSearches(filterPrefix?: string): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      const searches: string[] = data ? JSON.parse(data) : [];

      if (filterPrefix) {
        const prefix = filterPrefix.toLowerCase();
        return searches.filter((s) => s.toLowerCase().includes(prefix));
      }

      return searches;
    } catch {
      return [];
    }
  }

  /**
   * Adds a search query to recent searches.
   * If the query already exists, it's moved to the front (most recent).
   * Empty or whitespace-only queries are ignored.
   *
   * @param {string} query - The search query to add
   * @returns {void}
   *
   * @example
   * ```typescript
   * StorageService.addRecentSearch('facebook/react');
   * ```
   */
  public addRecentSearch(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const searches = this.getRecentSearches();

    // Remove existing entry if present (will be re-added at front)
    const filtered = searches.filter(
      (s) => s.toLowerCase() !== trimmedQuery.toLowerCase(),
    );

    // Add to front
    filtered.unshift(trimmedQuery);

    // Limit total count
    this.saveRecentSearches(
      filtered.slice(0, PAGINATION_CONFIG.MAX_RECENT_SEARCHES),
    );
  }

  /**
   * Removes a specific search query from recent searches.
   *
   * @param {string} query - The exact query to remove
   * @returns {void}
   *
   * @example
   * ```typescript
   * StorageService.removeRecentSearch('facebook/react');
   * ```
   */
  public removeRecentSearch(query: string): void {
    const searches = this.getRecentSearches();
    const filtered = searches.filter(
      (s) => s.toLowerCase() !== query.toLowerCase(),
    );
    this.saveRecentSearches(filtered);
  }

  /**
   * Clears all recent search queries.
   *
   * @returns {void}
   *
   * @example
   * ```typescript
   * StorageService.clearRecentSearches();
   * ```
   */
  public clearRecentSearches(): void {
    localStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Retrieves all history entries (internal use).
   * @private
   */
  private getAllHistory(): AnalysisHistory[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Saves bookmarks to localStorage.
   * @private
   */
  private saveBookmarks(bookmarks: Bookmark[]): void {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  }

  /**
   * Saves history to localStorage.
   * @private
   */
  private saveHistory(history: AnalysisHistory[]): void {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }

  /**
   * Saves recent searches to localStorage.
   * @private
   */
  private saveRecentSearches(searches: string[]): void {
    localStorage.setItem(
      STORAGE_KEYS.RECENT_SEARCHES,
      JSON.stringify(searches),
    );
  }

  /**
   * Generates a unique ID.
   * @private
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Singleton instance of the storage service.
 * @type {StorageServiceClass}
 */
export const StorageService = new StorageServiceClass();
