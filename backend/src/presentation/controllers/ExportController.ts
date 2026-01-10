import { Request, Response } from "express";
import { GitHubService } from "../../application/services/GitHubService.js";
import { ExportStrategyFactory } from "../../application/strategies/ExportStrategies.js";
import { TimeFilter } from "../../core/entities/index.js";
import { ValidationError } from "../../core/errors/index.js";
import { GitHubUrlParser } from "../../shared/utils/GitHubUrlParser.js";
import { BaseController } from "./BaseController.js";

/**
 * Export controller for data export functionality
 * @class ExportController
 * @extends {BaseController}
 */
export class ExportController extends BaseController {
  private gitHubService: GitHubService;

  /**
   * Create new ExportController instance
   */
  constructor() {
    super();
    this.gitHubService = new GitHubService();
  }

  /**
   * Export repository data as CSV
   * GET /api/v1/export/csv
   */
  public exportCsv = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      await this.exportData(req, res, "csv");
    }
  );

  /**
   * Export repository data as JSON
   * GET /api/v1/export/json
   */
  public exportJson = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      await this.exportData(req, res, "json");
    }
  );

  /**
   * Export repository data as PDF
   * POST /api/v1/export/pdf
   */
  public exportPdf = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      await this.exportData(req, res, "pdf");
    }
  );

  /**
   * Common export logic
   */
  private async exportData(
    req: Request,
    res: Response,
    format: string
  ): Promise<void> {
    const url = (req.query.url || req.body?.url) as string;
    const username = (req.query.username || req.body?.username) as string;
    const branch = this.getBranch(req);
    const filter = this.getTimeFilter(req) as TimeFilter;

    if (!url && !username) {
      throw new ValidationError("Either url or username is required");
    }

    if (req.user?.accessToken) {
      this.gitHubService.setAuthToken(req.user.accessToken);
    }

    const strategy = ExportStrategyFactory.create(format);
    let data;
    let filename: string;

    if (url) {
      const { owner, repo } = GitHubUrlParser.parse(url);
      data = await this.gitHubService.fetchRepositoryStats(
        owner,
        repo,
        branch,
        filter
      );
      filename = `${owner}-${repo}-analysis`;
    } else {
      data = await this.gitHubService.fetchUserStats(username, filter);
      filename = `${username}-profile`;
    }

    const buffer = await strategy.export(data);

    res.setHeader("Content-Type", strategy.getContentType());
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}${strategy.getFileExtension()}"`
    );
    res.send(buffer);
  }
}

// Export singleton instance
export const exportController = new ExportController();
