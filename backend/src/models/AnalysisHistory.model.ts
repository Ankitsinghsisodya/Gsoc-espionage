import mongoose, { Document, Model, Schema } from "mongoose";
import { IAnalysisHistory } from "../../core/entities/index.js";

/**
 * Analysis history document interface
 * @interface AnalysisHistoryDocument
 */
export interface AnalysisHistoryDocument
  extends Omit<IAnalysisHistory, "id">,
    Document {}

/**
 * Summary sub-schema for analysis results
 */
const SummarySchema = new Schema(
  {
    totalPRs: { type: Number, required: true },
    contributors: { type: Number, required: true },
    mergedPRs: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * Analysis history schema for saving past analyses
 * Tracks user analysis history for quick re-access
 */
const AnalysisHistorySchema = new Schema<AnalysisHistoryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    repositoryUrl: {
      type: String,
      required: true,
      index: true,
    },
    branch: {
      type: String,
    },
    timeFilter: {
      type: String,
      enum: ["2w", "1m", "3m", "6m", "all"],
      required: true,
    },
    analysisType: {
      type: String,
      enum: ["repository", "user"],
      required: true,
    },
    summary: {
      type: SummarySchema,
      required: true,
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
      index: true,
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

// Compound indexes for efficient queries
AnalysisHistorySchema.index({ userId: 1, analyzedAt: -1 });
AnalysisHistorySchema.index({ userId: 1, repositoryUrl: 1 });

// TTL index to automatically delete old entries (30 days)
AnalysisHistorySchema.index(
  { analyzedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

/**
 * Analysis history model
 */
export const AnalysisHistoryModel: Model<AnalysisHistoryDocument> =
  mongoose.model<AnalysisHistoryDocument>(
    "AnalysisHistory",
    AnalysisHistorySchema
  );
