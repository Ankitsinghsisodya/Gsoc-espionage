import { Parser } from "json2csv";
import PDFDocument from "pdfkit";
import {
  IRepositoryStats,
  IUserProfileStats,
} from "../../core/entities/index.js";
import { IExportStrategy } from "../../core/interfaces/index.js";

/**
 * CSV Export Strategy
 * Implements IExportStrategy for CSV format
 * @class CsvExportStrategy
 * @implements {IExportStrategy}
 */
export class CsvExportStrategy implements IExportStrategy {
  /**
   * Export data to CSV format
   * @param {IRepositoryStats | IUserProfileStats} data - Data to export
   * @returns {Promise<Buffer>}
   */
  public async export(
    data: IRepositoryStats | IUserProfileStats
  ): Promise<Buffer> {
    const isRepoStats = "contributors" in data;

    if (isRepoStats) {
      return this.exportRepositoryStats(data as IRepositoryStats);
    } else {
      return this.exportUserStats(data as IUserProfileStats);
    }
  }

  /**
   * Get content type for HTTP response
   * @returns {string}
   */
  public getContentType(): string {
    return "text/csv";
  }

  /**
   * Get file extension
   * @returns {string}
   */
  public getFileExtension(): string {
    return ".csv";
  }

  /**
   * Export repository stats to CSV
   */
  private exportRepositoryStats(data: IRepositoryStats): Buffer {
    const fields = [
      "username",
      "totalPRs",
      "mergedPRs",
      "openPRs",
      "closedPRs",
      "isMaintainer",
      "totalAdditions",
      "totalDeletions",
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(data.contributors);

    return Buffer.from(csv, "utf-8");
  }

  /**
   * Export user stats to CSV
   */
  private exportUserStats(data: IUserProfileStats): Buffer {
    const prs = data.pullRequests.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      merged: pr.merged,
      repository: pr.repositoryName,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
    }));

    const parser = new Parser();
    const csv = parser.parse(prs);

    return Buffer.from(csv, "utf-8");
  }
}

/**
 * JSON Export Strategy
 * Implements IExportStrategy for JSON format
 * @class JsonExportStrategy
 * @implements {IExportStrategy}
 */
export class JsonExportStrategy implements IExportStrategy {
  /**
   * Export data to JSON format
   * @param {IRepositoryStats | IUserProfileStats} data - Data to export
   * @returns {Promise<Buffer>}
   */
  public async export(
    data: IRepositoryStats | IUserProfileStats
  ): Promise<Buffer> {
    const json = JSON.stringify(data, null, 2);
    return Buffer.from(json, "utf-8");
  }

  /**
   * Get content type for HTTP response
   * @returns {string}
   */
  public getContentType(): string {
    return "application/json";
  }

  /**
   * Get file extension
   * @returns {string}
   */
  public getFileExtension(): string {
    return ".json";
  }
}

/**
 * PDF Export Strategy
 * Implements IExportStrategy for PDF format
 * @class PdfExportStrategy
 * @implements {IExportStrategy}
 */
export class PdfExportStrategy implements IExportStrategy {
  /**
   * Export data to PDF format
   * @param {IRepositoryStats | IUserProfileStats} data - Data to export
   * @returns {Promise<Buffer>}
   */
  public async export(
    data: IRepositoryStats | IUserProfileStats
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const isRepoStats = "contributors" in data;

      if (isRepoStats) {
        this.generateRepositoryPdf(doc, data as IRepositoryStats);
      } else {
        this.generateUserPdf(doc, data as IUserProfileStats);
      }

      doc.end();
    });
  }

  /**
   * Get content type for HTTP response
   * @returns {string}
   */
  public getContentType(): string {
    return "application/pdf";
  }

  /**
   * Get file extension
   * @returns {string}
   */
  public getFileExtension(): string {
    return ".pdf";
  }

  /**
   * Generate PDF for repository stats
   */
  private generateRepositoryPdf(
    doc: PDFKit.PDFDocument,
    data: IRepositoryStats
  ): void {
    // Title
    doc
      .fontSize(24)
      .text(`PR Analysis: ${data.owner}/${data.repo}`, { align: "center" });
    doc.moveDown();

    // Summary
    doc.fontSize(16).text("Summary");
    doc.fontSize(12);
    doc.text(`Branch: ${data.branch || "All branches"}`);
    doc.text(`Time Filter: ${data.timeFilter}`);
    doc.text(`Total PRs: ${data.totalPRs}`);
    doc.text(`Total Contributors: ${data.contributors.length}`);
    doc.moveDown();

    // Top Contributors
    doc.fontSize(16).text("Top Contributors");
    doc.fontSize(10);

    const topContributors = data.contributors.slice(0, 10);
    for (const contributor of topContributors) {
      doc.text(
        `${contributor.username}: ${contributor.totalPRs} PRs (${
          contributor.mergedPRs
        } merged) ${contributor.isMaintainer ? "[Maintainer]" : ""}`
      );
    }
    doc.moveDown();

    // Label Distribution
    if (Object.keys(data.labelDistribution).length > 0) {
      doc.fontSize(16).text("Label Distribution");
      doc.fontSize(10);

      const sortedLabels = Object.entries(data.labelDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      for (const [label, count] of sortedLabels) {
        doc.text(`${label}: ${count}`);
      }
    }
  }

  /**
   * Generate PDF for user stats
   */
  private generateUserPdf(
    doc: PDFKit.PDFDocument,
    data: IUserProfileStats
  ): void {
    // Title
    doc
      .fontSize(24)
      .text(`User Profile: ${data.username}`, { align: "center" });
    doc.moveDown();

    // Summary
    doc.fontSize(16).text("Summary");
    doc.fontSize(12);
    doc.text(`Total PRs: ${data.totalStats.totalPRs}`);
    doc.text(`Merged PRs: ${data.totalStats.mergedPRs}`);
    doc.text(`Open PRs: ${data.totalStats.openPRs}`);
    doc.text(
      `Repositories Contributed: ${Object.keys(data.repositories).length}`
    );
    doc.moveDown();

    // Top Repositories
    doc.fontSize(16).text("Top Repositories");
    doc.fontSize(10);

    const sortedRepos = Object.values(data.repositories)
      .sort((a, b) => b.prCount - a.prCount)
      .slice(0, 10);

    for (const repo of sortedRepos) {
      doc.text(
        `${repo.fullName}: ${repo.prCount} PRs (${repo.mergedCount} merged)`
      );
    }
  }
}

/**
 * Export Strategy Factory
 * Factory pattern for creating export strategies
 * @class ExportStrategyFactory
 */
export class ExportStrategyFactory {
  /**
   * Create export strategy by format
   * @param {string} format - Export format (csv, json, pdf)
   * @returns {IExportStrategy}
   */
  public static create(format: string): IExportStrategy {
    switch (format.toLowerCase()) {
      case "csv":
        return new CsvExportStrategy();
      case "json":
        return new JsonExportStrategy();
      case "pdf":
        return new PdfExportStrategy();
      default:
        return new JsonExportStrategy();
    }
  }
}
