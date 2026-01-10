import { Request, Response } from "express";
import { NotFoundError } from "../../core/errors/index.js";
import { AnalysisHistoryModel } from "../../models/index.js";
import { BaseController } from "./BaseController.js";

/**
 * History controller for managing analysis history
 * @class HistoryController
 * @extends {BaseController}
 */
export class HistoryController extends BaseController {
  /**
   * Get user's analysis history
   * GET /api/v1/history
   */
  public getHistory = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { page, limit } = this.getPagination(req);

      const skip = (page - 1) * limit;

      const [history, total] = await Promise.all([
        AnalysisHistoryModel.find({ userId })
          .sort({ analyzedAt: -1 })
          .skip(skip)
          .limit(limit),
        AnalysisHistoryModel.countDocuments({ userId }),
      ]);

      this.sendSuccess(res, {
        history,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      });
    }
  );

  /**
   * Delete a history entry
   * DELETE /api/v1/history/:id
   */
  public deleteHistory = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { id } = req.params;

      const entry = await AnalysisHistoryModel.findOneAndDelete({
        _id: id,
        userId,
      });

      if (!entry) {
        throw new NotFoundError("History entry", id);
      }

      this.sendNoContent(res);
    }
  );

  /**
   * Clear all history
   * DELETE /api/v1/history
   */
  public clearHistory = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;

      await AnalysisHistoryModel.deleteMany({ userId });

      this.sendNoContent(res);
    }
  );
}

// Export singleton instance
export const historyController = new HistoryController();
