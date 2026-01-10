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
    const filename = `${this.sanitizeFilename(
      data.owner
    )}-${this.sanitizeFilename(data.repo)}-contributors.csv`;

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
    const filename = `${this.sanitizeFilename(
      data.owner
    )}-${this.sanitizeFilename(data.repo)}-analysis.json`;

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
    const filename = `${this.sanitizeFilename(
      data.username
    )}-pull-requests.csv`;

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
    const filename = `${this.sanitizeFilename(data.username)}-profile.json`;

    this.downloadFile(json, filename, "application/json");
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Sanitizes a string for use as a filename.
   * Replaces filesystem-unsafe characters with hyphens.
   * @private
   *
   * @param {string} name - The string to sanitize
   * @returns {string} Sanitized filename-safe string
   */
  private sanitizeFilename(name: string): string {
    // Replace unsafe characters: / \ : * ? " < > |
    return name.replace(/[/\\:*?"<>|]/g, "-").replace(/--+/g, "-");
  }

  /**
   * Generates a CSV string from headers and row data.
   * Applies RFC 4180 escaping for proper CSV format.
   * @private
   *
   * @param {string[]} headers - Column headers
   * @param {(string | number | boolean | null | undefined)[]} rows - Data rows
   * @returns {string} Formatted CSV string
   */
  private generateCsv(
    headers: string[],
    rows: (string | number | boolean | null | undefined)[][]
  ): string {
    const escapedHeaders = headers.map((h) => this.escapeCsvField(h));
    const headerLine = escapedHeaders.join(",");

    const dataLines = rows.map((row) =>
      row.map((cell) => this.escapeCsvField(cell)).join(",")
    );

    return [headerLine, ...dataLines].join("\n");
  }

  /**
   * Escapes a field for CSV format per RFC 4180.
   * Converts value to string, then wraps in quotes and escapes internal quotes
   * if the field contains comma, double-quote, or newline.
   * @private
   *
   * @param {string | number | boolean | null | undefined} field - The field to escape
   * @returns {string} Escaped field safe for CSV
   */
  private escapeCsvField(
    field: string | number | boolean | null | undefined
  ): string {
    // Convert to string
    const str = field === null || field === undefined ? "" : String(field);

    // Check if escaping is needed (contains comma, quote, or newline)
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      // Escape quotes by doubling them, wrap in quotes
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
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
