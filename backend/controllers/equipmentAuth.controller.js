// backend/controllers/equipmentAuth.controller.js

import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import { getIO } from "../config/socketio.js";

// Define cascading rules (Same as in authenticate, but used for locking too)
const CASCADING_RULES = {
  'Laser_Engraver_01': [
    'CNC_Machine_01',
    'Welding_Station_01',
    '3D_Printer_01'
  ]
};

// Helper to broadcast updates
const emitEquipmentUpdate = (equipmentId, data) => {
  try {
    const io = getIO();
    if (io) {
      io.emit("equipment:status:update", { equipmentId, ...data });
    }
  } catch (error) {
    console.error("Socket emit failed:", error);
  }
};

class EquipmentAuthController {
  
  // --- INTERNAL HELPER: Lock Equipment & Dependents ---
  async _performLock(equipmentId, reason = "MANUAL_REVOKE") {
    // 1. Fetch equipment to check for dependents
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: { lab: true }
    });

    if (!equipment) return null;

    // 2. Identify all equipment to lock (Target + Dependents)
    const idsToLock = [equipment.id];
    
    if (CASCADING_RULES[equipment.name]) {
      const dependentNames = CASCADING_RULES[equipment.name];
      const dependents = await prisma.equipment.findMany({
        where: {
          labId: equipment.labId,
          name: { in: dependentNames }
        },
        select: { id: true }
      });
      dependents.forEach(eq => idsToLock.push(eq.id));
    }

    // 3. Update DB: Lock all identified equipment
    await prisma.$transaction([
      // Lock Equipment
      prisma.equipment.updateMany({
        where: { id: { in: idsToLock } },
        data: {
          isLocked: true,
          currentUserId: null,
          requiresAuthentication: true
        }
      }),
      // Update Status to IDLE
      prisma.equipmentStatus.updateMany({
        where: { equipmentId: { in: idsToLock } },
        data: {
          status: 'IDLE',
          currentOperator: null
        }
      }),
      // Close any active logs for these devices
      prisma.equipmentAccessLog.updateMany({
        where: { 
          equipmentId: { in: idsToLock },
          accessRevokedAt: null
        },
        data: { 
          accessRevokedAt: new Date(),
          failureReason: reason 
        }
      })
    ]);

    // 4. Emit Updates
    idsToLock.forEach(id => {
      emitEquipmentUpdate(id, {
        isLocked: true,
        currentUserId: null,
        status: 'IDLE'
      });
    });

    return idsToLock.length;
  }

  // --- PUBLIC: Authenticate ---
  authenticateStudent = async (req, res) => {
    try {
      const { aadhaarNumber, biometricData, equipmentId } = req.body;

      const student = await prisma.student.findUnique({ where: { aadhaarNumber } });
      if (!student) return res.status(404).json({ success: false, message: "Student not found." });

      if (!biometricData || !biometricData.credentialId) {
        return res.status(400).json({ success: false, message: "Invalid biometric data." });
      }

      const targetEquipment = await prisma.equipment.findUnique({
        where: { id: equipmentId },
      });

      if (!targetEquipment) return res.status(404).json({ success: false, message: "Equipment not found." });

      // Identify equipment to unlock (Cascading)
      const equipmentToUnlock = [targetEquipment.id];
      if (CASCADING_RULES[targetEquipment.name]) {
        const dependents = await prisma.equipment.findMany({
          where: { labId: targetEquipment.labId, name: { in: CASCADING_RULES[targetEquipment.name] } },
          select: { id: true }
        });
        dependents.forEach(eq => equipmentToUnlock.push(eq.id));
      }

      // Perform Unlock
      await prisma.$transaction(
        equipmentToUnlock.map(id => 
          prisma.equipment.update({
            where: { id },
            data: {
              isLocked: false,
              currentUserId: student.id,
              requiresAuthentication: false,
              status: { update: { status: 'IN_USE', currentOperator: `${student.firstName}`, lastUsedAt: new Date() } }
            }
          })
        )
      );

      // Create Log (Only for the primary equipment authenticated)
      await prisma.equipmentAccessLog.create({
        data: {
          studentId: student.id,
          equipmentId: targetEquipment.id,
          aadhaarVerified: true,
          biometricVerified: true,
          accessStatus: "GRANTED",
          deviceInfo: "PC Browser"
        }
      });

      // Broadcast
      equipmentToUnlock.forEach(id => {
        emitEquipmentUpdate(id, { isLocked: false, currentUserId: student.id, status: 'IN_USE' });
      });

      return res.status(200).json({ success: true, message: "Unlocked successfully.", data: { studentName: student.firstName } });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Auth error" });
    }
  };

  // --- PUBLIC: Manual Revoke ---
  revokeAccess = async (req, res) => {
    try {
      const { equipmentId } = req.params;
      await this._performLock(equipmentId, "MANUAL_REVOKE");
      return res.json({ success: true, message: "Access revoked. Equipment locked." });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  // --- JOB: Auto-Lock Expired Sessions ---
  checkAndAutoLockSessions = async () => {
    try {
      // 1. Calculate time threshold (2 hours ago)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      // 2. Find active sessions older than 2 hours
      const expiredLogs = await prisma.equipmentAccessLog.findMany({
        where: {
          accessRevokedAt: null, // Session is still active
          createdAt: { lt: twoHoursAgo } // Created more than 2 hours ago
        },
        select: { equipmentId: true, studentId: true }
      });

      if (expiredLogs.length === 0) return 0;

      logger.info(`⏰ Found ${expiredLogs.length} expired equipment sessions.`);

      // 3. Lock each expired equipment (and its dependents)
      let lockedCount = 0;
      for (const log of expiredLogs) {
        const count = await this._performLock(log.equipmentId, "AUTO_TIMEOUT_2HR");
        lockedCount += count || 0;
      }

      return lockedCount;

    } catch (error) {
      logger.error("Error in auto-lock check:", error);
      return 0;
    }
  };

  // ... (Other existing methods like checkEquipmentStatus)
  checkEquipmentStatus = async (req, res) => { /* ... existing code ... */ };
  getAccessLogs = async (req, res) => { /* ... existing code ... */ };
}

export default new EquipmentAuthController();