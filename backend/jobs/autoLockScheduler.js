// backend/jobs/autoLock.scheduler.js

import cron from "node-cron";
import equipmentAuthController from "../controllers/equipmentAuth.controller.js";
import logger from "../utils/logger.js";

/**
 * Schedules a job to check for equipment sessions exceeding 2 hours.
 * Runs every 5 minutes.
 */
export const scheduleAutoLock = () => {
  // Cron expression: "*/5 * * * *" means "Every 5 minutes"
  cron.schedule("*/5 * * * *", async () => {
    try {
      // Run the check silently unless it finds something
      const lockedCount = await equipmentAuthController.checkAndAutoLockSessions();
      
      if (lockedCount > 0) {
        logger.info(`🔒 Auto-Lock Job: Locked ${lockedCount} equipment items due to timeout.`);
      }
    } catch (error) {
      logger.error("❌ Error in Auto-Lock Scheduler:", error);
    }
  });

  logger.info("📅 Auto-Lock Scheduler initialized (Runs every 5 minutes)");
};