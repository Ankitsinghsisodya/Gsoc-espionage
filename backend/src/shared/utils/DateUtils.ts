import { TimeFilter } from "../../core/entities/index.js";

/**
 * Date utility class for time-based operations
 * @class DateUtils
 */
export class DateUtils {
  /**
   * Get the start date for a time filter
   * @param {TimeFilter} filter - Time filter option
   * @returns {Date} Start date for the filter period
   */
  public static getStartDate(filter: TimeFilter): Date {
    const now = new Date();

    switch (filter) {
      case "2w":
        return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      case "1m":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "3m":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case "6m":
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      case "all":
        return new Date(0); // Unix epoch - beginning of time
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 1 month
    }
  }

  /**
   * Calculate duration between two dates in hours
   * @param {string | Date} start - Start date
   * @param {string | Date} end - End date
   * @returns {number} Duration in hours
   */
  public static getHoursBetween(
    start: string | Date,
    end: string | Date
  ): number {
    const startDate = typeof start === "string" ? new Date(start) : start;
    const endDate = typeof end === "string" ? new Date(end) : end;

    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  }

  /**
   * Format date to ISO string
   * @param {Date} date - Date to format
   * @returns {string} ISO date string
   */
  public static toISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * Format date to YYYY-MM-DD string
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  public static toDateString(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Check if date is within time filter range
   * @param {string | Date} date - Date to check
   * @param {TimeFilter} filter - Time filter
   * @returns {boolean} Whether date is within range
   */
  public static isWithinFilter(
    date: string | Date,
    filter: TimeFilter
  ): boolean {
    const checkDate = typeof date === "string" ? new Date(date) : date;
    const startDate = DateUtils.getStartDate(filter);

    return checkDate >= startDate;
  }

  /**
   * Get time filter label for display
   * @param {TimeFilter} filter - Time filter
   * @returns {string} Human-readable label
   */
  public static getFilterLabel(filter: TimeFilter): string {
    const labels: Record<TimeFilter, string> = {
      "2w": "Last 2 Weeks",
      "1m": "Last Month",
      "3m": "Last 3 Months",
      "6m": "Last 6 Months",
      all: "All Time",
    };

    return labels[filter] || "Unknown";
  }

  /**
   * Generate date range for activity timeline
   * @param {TimeFilter} filter - Time filter
   * @returns {string[]} Array of date strings (YYYY-MM-DD)
   */
  public static generateDateRange(filter: TimeFilter): string[] {
    const dates: string[] = [];
    const startDate = DateUtils.getStartDate(filter);
    const endDate = new Date();

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(DateUtils.toDateString(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Get relative time string (e.g., "2 hours ago")
   * @param {string | Date} date - Date to format
   * @returns {string} Relative time string
   */
  public static getRelativeTime(date: string | Date): string {
    const now = new Date();
    const targetDate = typeof date === "string" ? new Date(date) : date;
    const diffMs = now.getTime() - targetDate.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "just now";
  }
}
