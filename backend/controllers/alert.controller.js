// =====================================================
// backend/controllers/alert.controller.js (FIXED)
// =====================================================

import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import { filterDataByRole } from "../middlewares/rbac.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class AlertController {
  // Get all alerts
  getAllAlerts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, severity, isResolved } = req.query;
    const skip = (page - 1) * limit;
    const roleFilter = filterDataByRole(req);

    const where = {
      equipment: roleFilter,
      ...(severity && { severity }),
      ...(isResolved !== undefined && { isResolved: isResolved === "true" }),
    };

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          equipment: {
            // --- THIS IS THE FIX ---
            // 'location' does not exist on the Equipment model.
            // We will select the 'lab' name instead, which is more useful.
            select: {
              equipmentId: true,
              name: true,
              lab: { select: { name: true } },
            },
            // --- END FIX ---
          },
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.alert.count({ where }),
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // Resolve alert
  resolveAlert = asyncHandler(async (req, res) => {
    try {
      const alert = await prisma.alert.update({
        where: { id: req.params.id },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: req.user.email,
        },
      });
      logger.info(`Alert ${req.params.id} resolved by ${req.user.email}`);
      res.json({
        success: true,
        message: "Alert resolved successfully.",
        data: alert,
      });
    } catch (error) {
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ success: false, message: "Alert not found." });
      }
      throw error;
    }
  });
}

export default new AlertController();
