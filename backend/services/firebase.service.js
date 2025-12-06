// backend/services/firebase.service.js - UPDATED WITH FAULT DETECTION
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import { broadcastEquipmentStatus, broadcastAlert } from "../config/socketio.js";
import { ALERT_TYPE, ALERT_SEVERITY, NOTIFICATION_TYPE, USER_ROLE_ENUM } from "../utils/constants.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgUs59TXYUQR4D0okAU0OsSypsThl5l0A",
  authDomain: "sih-25-temp.firebaseapp.com",
  databaseURL: "https://sih-25-temp-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sih-25-temp",
  storageBucket: "sih-25-temp.firebasestorage.app",
  messagingSenderId: "343588408716",
  appId: "1:343588408716:web:5a8cecc634f2400a581aa9"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// FAULT DETECTION THRESHOLDS
const FAULT_THRESHOLDS = {
  temperature: {
    critical: 85,    // Above this = CRITICAL fault
    warning: 75,     // Above this = WARNING
  },
  vibration: {
    critical: 8,     // Above this = CRITICAL fault
    warning: 6,      // Above this = WARNING
  },
  energyConsumption: {
    critical: 450,   // Above this = CRITICAL fault
    warning: 400,    // Above this = WARNING
  }
};

// Helper: Check if equipment is faulty
const detectFault = (temperature, vibration, energyConsumption) => {
  let isFaulty = false;
  let severity = 'LOW';
  let reasons = [];

  // Check Temperature
  if (temperature >= FAULT_THRESHOLDS.temperature.critical) {
    isFaulty = true;
    severity = 'CRITICAL';
    reasons.push(`Critical temperature: ${temperature}°C`);
  } else if (temperature >= FAULT_THRESHOLDS.temperature.warning) {
    isFaulty = true;
    if (severity !== 'CRITICAL') severity = 'HIGH';
    reasons.push(`High temperature: ${temperature}°C`);
  }

  // Check Vibration
  if (vibration >= FAULT_THRESHOLDS.vibration.critical) {
    isFaulty = true;
    severity = 'CRITICAL';
    reasons.push(`Critical vibration: ${vibration} mm/s`);
  } else if (vibration >= FAULT_THRESHOLDS.vibration.warning) {
    isFaulty = true;
    if (severity !== 'CRITICAL') severity = 'HIGH';
    reasons.push(`High vibration: ${vibration} mm/s`);
  }

  // Check Energy Consumption
  if (energyConsumption >= FAULT_THRESHOLDS.energyConsumption.critical) {
    isFaulty = true;
    severity = 'CRITICAL';
    reasons.push(`Critical energy: ${energyConsumption}W`);
  } else if (energyConsumption >= FAULT_THRESHOLDS.energyConsumption.warning) {
    isFaulty = true;
    if (severity !== 'CRITICAL' && severity !== 'HIGH') severity = 'MEDIUM';
    reasons.push(`High energy: ${energyConsumption}W`);
  }

  return { isFaulty, severity, reasons: reasons.join(', ') };
};

class FirebaseService {
  constructor() {
    this.activeListeners = new Map();
  }

  async startListening(firebaseDeviceId, equipmentId) {
    if (this.activeListeners.has(firebaseDeviceId)) {
      logger.info(`Already listening to ${firebaseDeviceId}`);
      return;
    }

    const deviceRef = ref(db, `UsersData/${firebaseDeviceId}/readings`);
    
    logger.info(`📡 Setting up listener for: UsersData/${firebaseDeviceId}/readings`);

    const unsubscribe = onValue(
      deviceRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          logger.info(`📊 Firebase data received for ${firebaseDeviceId}`);

          const timestamps = Object.keys(data);
          
          if (timestamps.length === 0) {
            logger.warn(`⚠️ No readings found for ${firebaseDeviceId}`);
            return;
          }

          const latestTimestamp = timestamps.sort().reverse()[0];
          const latestReading = data[latestTimestamp];

          logger.info(`🔥 Latest reading for ${firebaseDeviceId}:`, {
            timestamp: latestTimestamp,
            data: latestReading
          });

          await this.processReading(equipmentId, latestReading, firebaseDeviceId);
        } else {
          logger.warn(`⚠️ No data exists at UsersData/${firebaseDeviceId}/readings`);
        }
      },
      (error) => {
        logger.error(`❌ Firebase listener error for ${firebaseDeviceId}:`, error);
      }
    );

    this.activeListeners.set(firebaseDeviceId, unsubscribe);
    logger.info(`✅ Firebase listener active for ${firebaseDeviceId}`);
  }

  async processReading(equipmentId, reading, firebaseDeviceId) {
    try {
      logger.info(`🔧 Processing reading for equipment ${equipmentId}:`, reading);

      // Extract values from reading
      let { temperature, vibration, energyConsumption, timestamp } = reading;

      if (!temperature) {
        logger.warn(`⚠️ No temperature data in reading for ${firebaseDeviceId}`);
        return;
      }

      // Fallback calculations if data missing
      if (vibration === undefined || vibration === null) {
         vibration = temperature > 60 ? (temperature - 50) / 20 : Math.random() * 2;
      }

      if (energyConsumption === undefined || energyConsumption === null) {
         energyConsumption = 150 + (temperature * 3);
      }

      // 🚨 FAULT DETECTION
      const faultCheck = detectFault(temperature, vibration, energyConsumption);
      
      logger.info(`🔍 Fault Detection Result for ${equipmentId}:`, faultCheck);

      // 1. Get current equipment status to check if it's already FAULTY
      const currentStatus = await prisma.equipmentStatus.findUnique({
        where: { equipmentId },
        select: { status: true }
      });

      const wasPreviouslyFaulty = currentStatus?.status === 'FAULTY';
      const isNowFaulty = faultCheck.isFaulty;

      // Determine new status
      let newStatus = currentStatus?.status || 'OPERATIONAL';
      if (isNowFaulty) {
        newStatus = 'FAULTY';
      } else if (wasPreviouslyFaulty && !isNowFaulty) {
        // Equipment recovered from fault
        newStatus = 'OPERATIONAL';
        logger.info(`✅ Equipment ${equipmentId} recovered from FAULTY state`);
      }

      logger.info(`💾 Storing sensor data for equipment ${equipmentId}`);

      // 2. Store in SensorData
      await prisma.sensorData.create({
        data: {
          equipmentId,
          temperature,
          vibration,
          energyConsumption,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          isAnomaly: faultCheck.isFaulty,
          anomalyScore: faultCheck.isFaulty ? 
            (faultCheck.severity === 'CRITICAL' ? 100 : faultCheck.severity === 'HIGH' ? 80 : 60) : 
            null
        }
      });

      // 3. Update EquipmentStatus
      const updatedStatus = await prisma.equipmentStatus.update({
        where: { equipmentId },
        data: {
          temperature,
          vibration,
          energyConsumption,
          lastUsedAt: new Date(),
          status: newStatus, // Update status based on fault detection
        },
        include: {
          equipment: {
            select: {
              id: true,
              equipmentId: true,
              name: true,
              firebaseDeviceId: true,
              lab: {
                select: {
                  id: true,
                  labId: true,
                  name: true,
                  instituteId: true,
                  department: true
                }
              }
            }
          }
        }
      });

      logger.info(`✅ EquipmentStatus updated for equipment ${equipmentId} - Status: ${newStatus}`);

      // 4. Update DepartmentAnalytics
      await prisma.departmentAnalytics.updateMany({
        where: { equipmentId },
        data: {
          temperature,
          vibration,
          energyConsumption,
        }
      });

      logger.info(`✅ Analytics updated for equipment ${equipmentId}`);

      // 5. 🚨 CREATE ALERT IF FAULT DETECTED (and wasn't previously faulty)
      if (isNowFaulty && !wasPreviouslyFaulty) {
        await this.createFaultAlert(updatedStatus.equipment, faultCheck);
      }

      // 6. 📡 BROADCAST VIA SOCKET.IO
      broadcastEquipmentStatus(equipmentId, {
        ...updatedStatus,
        temperature,
        vibration,
        energyConsumption,
        firebaseDeviceId,
        updatedAt: new Date(),
      });

      logger.info(`📡 Socket.IO broadcast sent for equipment ${equipmentId}`);
      logger.info(`🎉 Successfully processed reading from ${firebaseDeviceId}`);

    } catch (error) {
      logger.error(`❌ Error processing Firebase reading for equipment ${equipmentId}:`, {
        error: error.message,
        stack: error.stack
      });
    }
  }

  // 🚨 NEW: Create Fault Alert
  async createFaultAlert(equipment, faultCheck) {
    try {
      logger.info(`🚨 Creating fault alert for equipment ${equipment.equipmentId}`);

      // Find users to notify (Policy Makers, Lab Managers in same institute, Trainers in same lab)
      const usersToNotify = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { role: USER_ROLE_ENUM.POLICY_MAKER },
            { 
              role: USER_ROLE_ENUM.LAB_MANAGER, 
              instituteId: equipment.lab.instituteId,
              department: equipment.lab.department 
            },
            { 
              role: USER_ROLE_ENUM.TRAINER, 
              labId: equipment.lab.id 
            },
          ],
        },
        select: { id: true },
      });

      const userIds = usersToNotify.map((u) => u.id);

      // Create alert
      const alert = await prisma.alert.create({
        data: {
          equipmentId: equipment.id,
          type: ALERT_TYPE.FAULT_DETECTED,
          severity: faultCheck.severity,
          title: `Equipment Fault Detected: ${equipment.name}`,
          message: `Critical fault detected in ${equipment.name}. Reasons: ${faultCheck.reasons}. Immediate attention required.`,
          isResolved: false,
          notifications: {
            create: userIds.map((userId) => ({
              userId: userId,
              title: `⚠️ EQUIPMENT FAULT: ${equipment.name}`,
              message: `Fault detected in ${equipment.name} (${equipment.equipmentId}) at ${equipment.lab.name}. ${faultCheck.reasons}`,
              type: NOTIFICATION_TYPE.ALERT,
            })),
          },
        },
        include: {
          notifications: true,
          equipment: {
            select: {
              id: true,
              equipmentId: true,
              name: true,
              lab: { 
                select: { 
                  id: true,
                  labId: true,
                  name: true 
                } 
              },
            },
          },
        },
      });

      // Broadcast alert via Socket.IO
      broadcastAlert(alert);

      logger.info(`✅ Fault alert created and broadcast for equipment ${equipment.equipmentId}`);

      return alert;
    } catch (error) {
      logger.error(`❌ Error creating fault alert for equipment ${equipment.id}:`, error);
    }
  }

  async startAllListeners() {
    logger.info('🔥 Starting all Firebase listeners...');

    const equipment = await prisma.equipment.findMany({
      where: {
        firebaseDeviceId: { not: null },
        isActive: true
      },
      select: {
        id: true,
        firebaseDeviceId: true,
        name: true
      }
    });

    logger.info(`📡 Found ${equipment.length} equipment with Firebase devices`);

    for (const eq of equipment) {
      logger.info(`🔥 Starting Firebase listener for device: ${eq.firebaseDeviceId} (Equipment: ${eq.id})`);
      await this.startListening(eq.firebaseDeviceId, eq.id);
    }

    logger.info(`✅ Started ${equipment.length} Firebase listeners`);
  }

  stopAllListeners() {
    for (const [deviceId, unsubscribe] of this.activeListeners) {
      unsubscribe();
      logger.info(`Stopped listening to ${deviceId}`);
    }
    this.activeListeners.clear();
  }
}

export default new FirebaseService();