import mongoose from "mongoose";
import { config } from "../../config/AppConfig.js";
import { DatabaseError } from "../../core/errors/index.js";
import { Logger } from "../../shared/utils/Logger.js";

/**
 * MongoDB database connection class
 * Singleton pattern for managing database connection
 * @class Database
 */
class DatabaseClass {
  private static instance: DatabaseClass;
  private isConnected: boolean = false;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   * @returns {DatabaseClass}
   */
  public static getInstance(): DatabaseClass {
    if (!DatabaseClass.instance) {
      DatabaseClass.instance = new DatabaseClass();
    }
    return DatabaseClass.instance;
  }

  /**
   * Connect to MongoDB
   * @returns {Promise<void>}
   * @throws {DatabaseError} If connection fails
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      Logger.info("MongoDB already connected");
      return;
    }

    try {
      mongoose.set("strictQuery", true);

      // Connection event handlers
      mongoose.connection.on("connected", () => {
        Logger.info("MongoDB connected successfully");
        this.isConnected = true;
      });

      mongoose.connection.on("error", (err) => {
        Logger.error("MongoDB connection error", err);
        this.isConnected = false;
      });

      mongoose.connection.on("disconnected", () => {
        Logger.warn("MongoDB disconnected");
        this.isConnected = false;
      });

      // Graceful shutdown handlers
      process.on("SIGINT", async () => {
        await this.disconnect();
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        await this.disconnect();
        process.exit(0);
      });

      // Connect
      await mongoose.connect(config.mongodbUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;
    } catch (error) {
      Logger.error("Failed to connect to MongoDB", error as Error);
      throw new DatabaseError("Failed to connect to MongoDB", error);
    }
  }

  /**
   * Disconnect from MongoDB
   * @returns {Promise<void>}
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      Logger.info("MongoDB disconnected gracefully");
    } catch (error) {
      Logger.error("Error disconnecting from MongoDB", error as Error);
    }
  }

  /**
   * Check if database is connected
   * @returns {boolean}
   */
  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get mongoose connection
   * @returns {mongoose.Connection}
   */
  public getConnection(): mongoose.Connection {
    return mongoose.connection;
  }
}

// Export singleton instance
export const Database = DatabaseClass.getInstance();
