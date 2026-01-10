import { Router } from "express";
import apiRoutes from "./api.routes.js";
import authRoutes from "./auth.routes.js";

/**
 * Main router aggregating all routes
 */
const router = Router();

// API routes
router.use("/api/v1", apiRoutes);

// Auth routes
router.use("/auth", authRoutes);

export default router;
