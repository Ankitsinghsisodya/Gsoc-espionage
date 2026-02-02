/**
 * @fileoverview Date utility functions for time-based filtering and formatting.
 * Provides consistent date manipulation across the application.
 * @module utils/dateUtils
 */

import { TimeFilter } from "../types";

/**
 * Date utility functions for time filtering operations.
 * Follows Single Responsibility Principle - only handles date-related operations.
 */
export const DateUtils = {
  /**
   * Calculates the start date based on the given time filter.
   * Used to determine the date range for fetching historical data.
   *
   * @param {TimeFilter} filter - The time filter option (2w, 1m, 3m, 6m, all)
   * @returns {Date} The calculated start date
   *
   * @example
   * ```typescript
   * const startDate = DateUtils.getStartDate('1m');
   * // Returns a Date object for 1 month ago
   * ```
   */
  getStartDate(filter: TimeFilter): Date {
    const now = new Date();

    switch (filter) {
      case "2w":
        return new Date(now.setDate(now.getDate() - 14));
      case "1m":
        return new Date(now.setMonth(now.getMonth() - 1));
      case "3m":
        return new Date(now.setMonth(now.getMonth() - 3));
      case "6m":
        return new Date(now.setMonth(now.getMonth() - 6));
      case "12m":
        return new Date(now.setMonth(now.getMonth() - 12));
      case "all":
        // GitHub's founding year - practical lower bound
        return new Date("2008-01-01");
      default:
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  },

  /**
   * Generates an array of date strings from the filter's start date to today.
   * Useful for creating timeline charts and activity heatmaps.
   *
   * @param {TimeFilter} filter - The time filter to generate range for
   * @returns {string[]} Array of ISO date strings (YYYY-MM-DD format)
   *
   * @example
   * ```typescript
   * const dates = DateUtils.generateDateRange('2w');
   * // Returns ['2024-01-01', '2024-01-02', ..., '2024-01-14']
   * ```
   */
  generateDateRange(filter: TimeFilter): string[] {
    const dates: string[] = [];
    const startDate = this.getStartDate(filter);
    const now = new Date();

    const current = new Date(startDate);
    while (current <= now) {
      dates.push(this.toDateString(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  },

  /**
   * Converts a Date object to an ISO date string (YYYY-MM-DD).
   *
   * @param {Date} date - The date to convert
   * @returns {string} ISO date string in YYYY-MM-DD format
   *
   * @example
   * ```typescript
   * const dateStr = DateUtils.toDateString(new Date('2024-01-15T10:30:00'));
   * // Returns '2024-01-15'
   * ```
   */
  toDateString(date: Date): string {
    return date.toISOString().split("T")[0];
  },

  /**
   * Calculates the difference between two dates in hours.
   * Useful for calculating review times and merge durations.
   *
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @returns {number} Difference in hours (can be negative if end < start)
   *
   * @example
   * ```typescript
   * const hours = DateUtils.diffInHours(createdAt, mergedAt);
   * ```
   */
  diffInHours(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  },

  /**
   * Formats hours into a human-readable duration string.
   *
   * @param {number} hours - Number of hours
   * @returns {string} Formatted duration (e.g., "2d 5h" or "3h")
   *
   * @example
   * ```typescript
   * DateUtils.formatDuration(50); // "2d 2h"
   * DateUtils.formatDuration(5);  // "5h"
   * ```
   */
  formatDuration(hours: number): string {
    if (hours < 24) {
      return `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  },
};
