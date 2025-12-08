/*
 * =====================================================
 * 4. backend/routes/index.js (UPDATED)
 * =====================================================
 */
import express from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import labRoutes from "./lab.routes.js";
import instituteRoutes from "./institute.routes.js"; // --- ADD THIS ---
import equipmentRoutes from "./equipment.routes.js";
import monitoringRoutes from "./monitoring.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import alertRoutes from "./alert.routes.js";
import notificationRoutes from "./notification.routes.js";
import maintenanceRoutes from "./maintenance.routes.js";
import reportRoutes from "./report.routes.js";
import chatbotRoutes from "./chatbot.routes.js";
import breakdownRoutes from "./breakdown.routes.js";
import sldRoutes from "./sld.routes.js";
import equipmentAuthRoutes from "./equipmentAuth.routes.js";
import studentRoutes from "./student.routes.js";

const router = express.Router();

// API version info
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "IoT Equipment Monitoring API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      institutes: "/api/institutes", // --- ADD THIS ---
      labs: "/api/labs",
      equipment: "/api/equipment",
      monitoring: "/api/monitoring",
      analytics: "/api/analytics",
      alerts: "/api/alerts",
      notifications: "/api/notifications",
      maintenance: "/api/maintenance",
      reports: "/api/reports",
      chatbot: "/api/chatbot",
      equipmentAuth: "/api/equipment-auth",
      student: "/api/students",
    },
  });
});

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/institutes", instituteRoutes); // --- ADD THIS ---
router.use("/labs", labRoutes);
router.use("/equipment", equipmentRoutes);
router.use("/monitoring", monitoringRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/alerts", alertRoutes);
router.use("/notifications", notificationRoutes);
router.use("/maintenance", maintenanceRoutes);
router.use("/reports", reportRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/breakdown", breakdownRoutes);
router.use("/sld-layouts", sldRoutes);
router.use("/equipment-auth", equipmentAuthRoutes);
router.use("/students", studentRoutes);

export default router;
