import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import { config } from "./config/AppConfig.js";
import { CacheService } from "./infrastructure/cache/RedisCacheService.js";
import { Database } from "./infrastructure/database/mongoose.js";
import {
  ErrorHandler,
  RateLimiter,
  RequestLogger,
} from "./presentation/middleware/index.js";
import routes from "./presentation/routes/index.js";
import { Logger } from "./shared/utils/index.js";

/**
 * Express Application class
 * Configures middleware, routes, and starts the server
 * @class App
 */
class App {
  public app: Application;

  /**
   * Create new App instance
   */
  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  /**
   * Configure middleware
   */
  private configureMiddleware(): void {
    // Security headers
    this.app.use(
      helmet({
        contentSecurityPolicy: false, // Disable for API
      })
    );

    // CORS
    this.app.use(
      cors({
        origin: config.allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Session-Id"],
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));

    // Cookie parsing
    this.app.use(cookieParser());

    // Request logging
    this.app.use(RequestLogger.log);

    // Rate limiting
    this.app.use(RateLimiter.general());
  }

  /**
   * Configure routes
   */
  private configureRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (_req: Request, res: Response) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: Database.getConnectionStatus() ? "connected" : "disconnected",
        cache: CacheService.getConnectionStatus()
          ? "connected"
          : "disconnected",
      });
    });

    // API routes
    this.app.use(routes);

    // 404 handler
    this.app.use(ErrorHandler.notFound);
  }

  /**
   * Configure error handling
   */
  private configureErrorHandling(): void {
    this.app.use(ErrorHandler.handle);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    // Try to connect to database (optional - works without it for demo)
    Logger.info("Attempting to connect to MongoDB...");
    try {
      await Database.connect();
    } catch (dbError) {
      Logger.warn(
        "MongoDB not available - running in demo mode without database"
      );
      Logger.warn(
        "Features requiring database (bookmarks, history, auth) will be limited"
      );
    }

    // Validate production config (skip in development without full config)
    if (config.isProduction) {
      config.validateForProduction();
    }

    // Start server
    this.app.listen(config.port, () => {
      Logger.info(`🚀 Server running on port ${config.port}`);
      Logger.info(`📊 Environment: ${config.nodeEnv}`);
      Logger.info(`🔗 Health check: http://localhost:${config.port}/health`);
      if (!Database.getConnectionStatus()) {
        Logger.warn("⚠️  Running in demo mode - database features disabled");
      }
    });
  }
}

// Create and start app
const app = new App();
app.start();

export default app.app;
