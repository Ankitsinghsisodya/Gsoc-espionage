import mongoose, { Document, Model, Schema } from "mongoose";
import { IBookmark } from "../../core/entities/index.js";

/**
 * Bookmark document interface
 * @interface BookmarkDocument
 */
export interface BookmarkDocument extends Omit<IBookmark, "id">, Document {}

/**
 * Bookmark schema for saving favorite repos and users
 */
const BookmarkSchema = new Schema<BookmarkDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["repository", "user"],
      required: true,
    },
    targetUrl: {
      type: String,
      required: true,
    },
    targetName: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes
BookmarkSchema.index({ userId: 1, type: 1 });
BookmarkSchema.index({ userId: 1, targetUrl: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

/**
 * Bookmark model
 */
export const BookmarkModel: Model<BookmarkDocument> =
  mongoose.model<BookmarkDocument>("Bookmark", BookmarkSchema);
