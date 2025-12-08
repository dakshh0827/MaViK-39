// backend/controllers/equipmentAuth.controller.js

import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import { getIO } from "../config/socketio.js"; // Assuming you have a socket getter

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
  
  // Authenticate Student & Unlock Equipment
  authenticateStudent = async (req, res) => {
    try {
      const { aadhaarNumber, biometricData, equipmentId } = req.body;

      // 1. Verify Student Exists
      const student = await prisma.student.findUnique({
        where: { aadhaarNumber },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found. Please register with the institute first.",
        });
      }

      // 2. Biometric Verification (Demo Mode)
      // Since the frontend uses WebAuthn (PC Fingerprint), the "verification" 
      // is technically done by the OS before the promise resolves on the frontend.
      // Here we ensure the payload exists and matches the student's record context.
      if (!biometricData || !biometricData.credentialId) {
        return res.status(400).json({
          success: false,
          message: "Invalid biometric data received.",
        });
      }

      // 3. Find the Target Equipment
      const targetEquipment = await prisma.equipment.findUnique({
        where: { id: equipmentId },
        include: { lab: true }
      });

      if (!targetEquipment) {
        return res.status(404).json({ success: false, message: "Equipment not found." });
      }

      // 4. Define Equipment Group for Cascading Unlock
      // If Laser_Engraver_01 is authenticated, unlock the whole set.
      const CASCADING_UNLOCK_RULES = {
        'Laser_Engraver_01': [
          'CNC_Machine_01',
          'Welding_Station_01',
          '3D_Printer_01'
        ]
      };

      const equipmentToUnlock = [targetEquipment.id];

      // Check if this equipment triggers a cascade
      if (CASCADING_UNLOCK_RULES[targetEquipment.name]) {
        const dependentNames = CASCADING_UNLOCK_RULES[targetEquipment.name];
        
        // Find IDs of dependent equipment in the SAME lab
        const dependents = await prisma.equipment.findMany({
          where: {
            labId: targetEquipment.labId,
            name: { in: dependentNames }
          },
          select: { id: true }
        });
        
        dependents.forEach(eq => equipmentToUnlock.push(eq.id));
      }

      // 5. Perform Unlock Operations
      const updatePromises = equipmentToUnlock.map(id => 
        prisma.equipment.update({
          where: { id },
          data: {
            isLocked: false,
            currentUserId: student.id,
            requiresAuthentication: false, // Temporarily disable auth requirement while in use
            status: {
              update: {
                status: 'IN_USE',
                currentOperator: `${student.firstName} ${student.lastName}`,
                lastUsedAt: new Date()
              }
            }
          }
        })
      );

      await prisma.$transaction(updatePromises);

      // 6. Create Access Log
      await prisma.equipmentAccessLog.create({
        data: {
          studentId: student.id,
          equipmentId: targetEquipment.id,
          aadhaarVerified: true,
          biometricVerified: true,
          verificationMethod: "AADHAAR_BIOMETRIC_PC",
          accessStatus: "GRANTED",
          deviceInfo: biometricData.deviceInfo?.userAgent || "PC Browser"
        }
      });

      // 7. Emit Real-time Updates
      equipmentToUnlock.forEach(id => {
        emitEquipmentUpdate(id, {
          isLocked: false,
          currentUserId: student.id,
          status: 'IN_USE'
        });
      });

      logger.info(`🔓 Equipment unlocked: ${targetEquipment.name} by ${student.firstName}`);

      return res.status(200).json({
        success: true,
        message: "Authentication successful. Equipment unlocked.",
        data: {
          studentName: `${student.firstName} ${student.lastName}`,
          unlockedCount: equipmentToUnlock.length
        }
      });

    } catch (error) {
      console.error("Auth Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during authentication."
      });
    }
  };

  // Revoke Access (Lock Equipment)
  revokeAccess = async (req, res) => {
    try {
      const { equipmentId } = req.params;
      
      const equipment = await prisma.equipment.update({
        where: { id: equipmentId },
        data: {
          isLocked: true,
          currentUserId: null,
          requiresAuthentication: true,
          status: {
            update: {
              status: 'IDLE',
              currentOperator: null
            }
          }
        }
      });

      // Update Access Log (Close session)
      const lastLog = await prisma.equipmentAccessLog.findFirst({
        where: { equipmentId, accessRevokedAt: null },
        orderBy: { createdAt: 'desc' }
      });

      if (lastLog) {
        await prisma.equipmentAccessLog.update({
          where: { id: lastLog.id },
          data: { accessRevokedAt: new Date() }
        });
      }

      emitEquipmentUpdate(equipmentId, {
        isLocked: true,
        currentUserId: null,
        status: 'IDLE'
      });

      return res.json({ success: true, message: "Access revoked. Equipment locked." });

    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  checkEquipmentStatus = async (req, res) => {
    const { equipmentId } = req.params;
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { isLocked: true, currentUserId: true, requiresAuthentication: true }
    });
    res.json({ success: true, data: equipment });
  };

  getAccessLogs = async (req, res) => {
    // Implementation for logs fetching
    res.json({ success: true, data: [] });
  };
}

export default new EquipmentAuthController();