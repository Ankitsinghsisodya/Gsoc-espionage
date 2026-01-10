import { Request, Response } from "express";
import { NotFoundError, ValidationError } from "../../core/errors/index.js";
import { BookmarkModel } from "../../models/index.js";
import { BaseController } from "./BaseController.js";

/**
 * Bookmark controller for managing user bookmarks
 * @class BookmarkController
 * @extends {BaseController}
 */
export class BookmarkController extends BaseController {
  /**
   * Get user's bookmarks
   * GET /api/v1/bookmarks
   */
  public getBookmarks = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const type = req.query.type as string;

      const filter: any = { userId };
      if (type && ["repository", "user"].includes(type)) {
        filter.type = type;
      }

      const bookmarks = await BookmarkModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(100);

      this.sendSuccess(res, { bookmarks });
    }
  );

  /**
   * Add a bookmark
   * POST /api/v1/bookmarks
   */
  public addBookmark = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { type, targetUrl, targetName, notes } = req.body;

      if (!type || !targetUrl || !targetName) {
        throw new ValidationError(
          "type, targetUrl, and targetName are required"
        );
      }

      if (!["repository", "user"].includes(type)) {
        throw new ValidationError('type must be "repository" or "user"');
      }

      // Check for existing bookmark
      const existing = await BookmarkModel.findOne({ userId, targetUrl });
      if (existing) {
        throw new ValidationError("Bookmark already exists");
      }

      const bookmark = await BookmarkModel.create({
        userId,
        type,
        targetUrl,
        targetName,
        notes,
      });

      this.sendCreated(res, { bookmark });
    }
  );

  /**
   * Delete a bookmark
   * DELETE /api/v1/bookmarks/:id
   */
  public deleteBookmark = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { id } = req.params;

      const bookmark = await BookmarkModel.findOneAndDelete({
        _id: id,
        userId,
      });

      if (!bookmark) {
        throw new NotFoundError("Bookmark", id);
      }

      this.sendNoContent(res);
    }
  );
}

// Export singleton instance
export const bookmarkController = new BookmarkController();
