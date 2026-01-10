/**
 * @fileoverview Export service for generating downloadable files.
 * Provides CSV and JSON export functionality using browser Blob API.
 *
 * @module services/ExportService
 * @description
 * Client-side export service that generates downloadable files from
 * analysis data. Uses the Blob API and programmatic link clicking
 * for cross-browser compatibility.
 *
 * Follows Single Responsibility Principle - only handles data export.
 *
 * @example
 * ```typescript
 * import { ExportService } from './services';
 *
 * // Export repository data as CSV
 * ExportService.exportRepositoryCsv(repositoryStats);
 *
 * // Export as JSON
 * ExportService.exportRepositoryJson(repositoryStats);
 * ```
 */

import { RepositoryStats, UserProfileStats } from "../types";

/**
 * Supported export file formats.
 */
export type ExportFormat = "csv" | "json";

/**
 * Export Service Class - Handles file generation and download.
 *
 * @class ExportServiceClass
 * @description
 * Provides methods to export analysis data in various formats.
 * All exports happen client-side using the Blob API.
 */
class ExportServiceClass {
  // ============================================================================
  // Repository Exports
  // ============================================================================

  /**
   * Exports repository contributor statistics as a CSV file.
   * Triggers automatic download of the generated file.
   *
   * @param {RepositoryStats} data - Repository statistics to export
   * @returns {void}
   *
   * @example
   * ```typescript
   * ExportService.exportRepositoryCsv(repositoryStats);
   * // Downloads: "facebook-react-contributors.csv"
   * ```
   */
  public exportRepositoryCsv(data: RepositoryStats): void {
    const headers = [
      "username",
      "totalPRs",
      "mergedPRs",
      "openPRs",
      "closedPRs",
      "isMaintainer",
      "totalAdditions",
      "totalDeletions",
    ];

    const rows = data.contributors.map((contributor) => [
      contributor.username,
      contributor.totalPRs,
      contributor.mergedPRs,
      contributor.openPRs,
      contributor.closedPRs,
      contributor.isMaintainer,
      contributor.totalAdditions,
      contributor.totalDeletions,
    ]);

    const csv = this.generateCsv(headers, rows);
    const filename = `${data.owner}-${data.repo}-contributors.csv`;

    this.downloadFile(csv, filename, "text/csv");
  }

  /**
   * Exports repository statistics as a formatted JSON file.
   * Includes all data: contributors, PRs, labels, and activity timeline.
   *
   * @param {RepositoryStats} data - Repository statistics to export
   * @returns {void}
   *
   * @example
   * ```typescript
   * ExportService.exportRepositoryJson(repositoryStats);
   * // Downloads: "facebook-react-analysis.json"
   * ```
   */
  public exportRepositoryJson(data: RepositoryStats): void {
    const json = JSON.stringify(data, null, 2);
    const filename = `${data.owner}-${data.repo}-analysis.json`;

    this.downloadFile(json, filename, "application/json");
  }

  // ============================================================================
  // User Profile Exports
  // ============================================================================

  /**
   * Exports user pull request history as a CSV file.
   *
   * @param {UserProfileStats} data - User statistics to export
   * @returns {void}
   *
   * @example
   * ```typescript
   * ExportService.exportUserCsv(userStats);
   * // Downloads: "octocat-pull-requests.csv"
   * ```
   */
  public exportUserCsv(data: UserProfileStats): void {
    const headers = [
      "number",
      "title",
      "state",
      "merged",
      "repository",
      "createdAt",
      "mergedAt",
    ];

    const rows = data.pullRequests.map((pr) => [
      pr.number,
      this.escapeCsvField(pr.title),
      pr.state,
      pr.merged,
      pr.repositoryName,
      pr.createdAt,
      pr.mergedAt || "",
    ]);

    const csv = this.generateCsv(headers, rows);
    const filename = `${data.username}-pull-requests.csv`;

    this.downloadFile(csv, filename, "text/csv");
  }

  /**
   * Exports user profile and statistics as a formatted JSON file.
   *
   * @param {UserProfileStats} data - User statistics to export
   * @returns {void}
   *
   * @example
   * ```typescript
   * ExportService.exportUserJson(userStats);
   * // Downloads: "octocat-profile.json"
   * ```
   */
  public exportUserJson(data: UserProfileStats): void {
    const json = JSON.stringify(data, null, 2);
    const filename = `${data.username}-profile.json`;

    this.downloadFile(json, filename, "application/json");
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Generates a CSV string from headers and row data.
   * @private
   *
   * @param {string[]} headers - Column headers
   * @param {(string | number | boolean)[]} rows - Data rows
   * @returns {string} Formatted CSV string
   */
  private generateCsv(
    headers: string[],
    rows: (string | number | boolean)[][]
  ): string {
    const headerLine = headers.join(",");
    const dataLines = rows.map((row) => row.join(","));

    return [headerLine, ...dataLines].join("\n");
  }

  /**
   * Escapes a field for CSV format.
   * Wraps in quotes and escapes internal quotes.
   * @private
   *
   * @param {string} field - The field to escape
   * @returns {string} Escaped field safe for CSV
   */
  private escapeCsvField(field: string): string {
    // Escape quotes by doubling them, wrap in quotes
    return `"${field.replace(/"/g, '""')}"`;
  }

  /**
   * Creates and triggers download of a file.
   * Uses Blob API and programmatic link clicking for cross-browser support.
   * @private
   *
   * @param {string} content - File content
   * @param {string} filename - Name for the downloaded file
   * @param {string} mimeType - MIME type (e.g., 'text/csv', 'application/json')
   * @returns {void}
   */
  private downloadFile(
    content: string,
    filename: string,
    mimeType: string
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    // Append to body, click, then remove (required for Firefox)
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Release the object URL to free memory
    URL.revokeObjectURL(url);
  }
}

/**
 * Singleton instance of the export service.
 * @type {ExportServiceClass}
 */
export const ExportService = new ExportServiceClass();
