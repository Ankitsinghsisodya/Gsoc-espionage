import mongoose, { Document, Model, Schema } from "mongoose";
import { IUser, IUserSettings } from "../../core/entities/index.js";

/**
 * User document interface extending Mongoose Document
 * @interface UserDocument
 */
export interface UserDocument extends Omit<IUser, "id">, Document {}

/**
 * User settings sub-schema
 */
const UserSettingsSchema = new Schema<IUserSettings>(
  {
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "dark",
    },
    defaultTimeFilter: {
      type: String,
      enum: ["2w", "1m", "3m", "6m", "all"],
      default: "1m",
    },
  },
  { _id: false }
);

/**
 * User schema for authenticated users
 * Stores OAuth credentials and user preferences
 */
const UserSchema = new Schema<UserDocument>(
  {
    githubId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
    },
    avatarUrl: {
      type: String,
    },
    accessToken: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    tokenExpiresAt: {
      type: Date,
    },
    settings: {
      type: UserSettingsSchema,
      default: () => ({
        theme: "dark",
        defaultTimeFilter: "1m",
      }),
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.accessToken; // Never expose tokens
        delete ret.refreshToken;
        return ret;
      },
    },
  }
);

// Indexes
UserSchema.index({ createdAt: -1 });

/**
 * User model
 */
export const UserModel: Model<UserDocument> = mongoose.model<UserDocument>(
  "User",
  UserSchema
);
