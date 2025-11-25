/*
 * =====================================================
 * backend/routes/sldLayoutRoutes.js (FIXED)
 * =====================================================
 * Routes for managing SLD layout configurations, integrated with RBAC.
 */
import express from "express";
import protect from "../middlewares/auth.js";
import { can } from "../middlewares/rbac.js";
import { 
    getSLDLayout, 
    updateSLDLayout 
} from "../controllers/sldLayout.controller.js"; // Fixed import path

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// 1. Get SLD layout for a lab
router.get("/:labId", can.viewSLD, getSLDLayout);

// 2. Update SLD layout (Lab Manager only)
router.put("/:labId", can.manageSLD, updateSLDLayout);

export default router;