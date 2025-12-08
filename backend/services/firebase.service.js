// backend/services/firebase.service.js - UPDATED WITH REAL-TIME HEALTH/EFFICIENCY CALCULATION
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
    critical: 85,
    warning: 75,
  },
  vibration: {
    critical: 8,
    warning: 6,
  },
  energyConsumption: {
    critical: 450,
    warning: 400,
  }
};

// ========================================
// 🆕 REAL-TIME HEALTH & EFFICIENCY CALCULATION
// ========================================
const calculateMetrics = (temp, vib, energy) => {
  const t = temp || 0;
  const v = vib || 0;
  const e = energy || 0;

  // --- Health Score Calculation (ADJUSTED) ---
  // Baseline: 100
  // ADJUSTED Penalties (less severe):
  // - Temperature: -0.8 points per degree above 60°C (was 50°C at -1.5)
  // - Vibration: -3 points per mm/s (was -5)
  // - Energy: -0.03 points per W above 550W (was 500W at -0.05)
  let healthPenalties = 0;
  
  if (t > 60) healthPenalties += (t - 60) * 0.8;  // Less severe, higher threshold
  healthPenalties += v * 3;  // Reduced from 5 to 3
  if (e > 550) healthPenalties += (e - 550) * 0.03;  // Higher threshold, less penalty

  const healthScore = Math.max(0, Math.min(100, 100 - healthPenalties));

  // --- Efficiency Calculation (ADJUSTED) ---
  // Baseline: 100
  // ADJUSTED Penalties (less severe):
  // - Vibration: -4 points per mm/s (was -8)
  // - Temperature: -1 point per degree above 70°C (was 60°C at -2)
  let efficiencyPenalties = 0;
  
  efficiencyPenalties += v * 4;  // Reduced from 8 to 4
  if (t > 70) efficiencyPenalties += (t - 70) * 1;  // Higher threshold, less penalty

  const efficiency = Math.max(0, Math.min(100, 100 - efficiencyPenalties));

  return { 
    healthScore: parseFloat(healthScore.toFixed(1)), 
    efficiency: parseFloat(efficiency.toFixed(1)) 
  };
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

      // ========================================
      // 🆕 CALCULATE HEALTH & EFFICIENCY IN REAL-TIME
      // ========================================
      const { healthScore, efficiency } = calculateMetrics(temperature, vibration, energyConsumption);
      
      logger.info(`📊 Real-time metrics calculated for ${equipmentId}:`, {
        temperature,
        vibration,
        energyConsumption,
        healthScore,
        efficiency
      });

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

      // ========================================
      // 🆕 UPDATE STATUS WITH CALCULATED METRICS
      // ========================================
      const updatedStatus = await prisma.equipmentStatus.update({
        where: { equipmentId },
        data: {
          temperature,
          vibration,
          energyConsumption,
          healthScore, // 🆕 Real-time calculated health score
          lastUsedAt: new Date(),
          status: newStatus,
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

      logger.info(`✅ EquipmentStatus updated for equipment ${equipmentId} - Status: ${newStatus}, Health: ${healthScore}%`);

      // ========================================
      // 🆕 UPDATE ANALYTICS WITH CALCULATED EFFICIENCY
      // ========================================
      await prisma.departmentAnalytics.updateMany({
        where: { equipmentId },
        data: {
          temperature,
          vibration,
          energyConsumption,
          efficiency, // 🆕 Real-time calculated efficiency
        }
      });

      logger.info(`✅ Analytics updated for equipment ${equipmentId} - Efficiency: ${efficiency}%`);

      // 5. 🚨 CREATE ALERT IF FAULT DETECTED (and wasn't previously faulty)
      if (isNowFaulty && !wasPreviouslyFaulty) {
        await this.createFaultAlert(updatedStatus.equipment, faultCheck);
      }

      // ========================================
      // 🆕 BROADCAST WITH CALCULATED METRICS VIA SOCKET.IO
      // ========================================
      broadcastEquipmentStatus(equipmentId, {
        ...updatedStatus,
        temperature,
        vibration,
        energyConsumption,
        healthScore, // 🆕 Include calculated health score
        efficiency,  // 🆕 Include calculated efficiency
        firebaseDeviceId,
        updatedAt: new Date(),
      });

      logger.info(`📡 Socket.IO broadcast sent for equipment ${equipmentId} with real-time metrics`);
      logger.info(`🎉 Successfully processed reading from ${firebaseDeviceId}`);

    } catch (error) {
      logger.error(`❌ Error processing Firebase reading for equipment ${equipmentId}:`, {
        error: error.message,
        stack: error.stack
      });
    }
  }

  // 🚨 Create Fault Alert
  async createFaultAlert(equipment, faultCheck) {
    try {
      logger.info(`🚨 Creating fault alert for equipment ${equipment.equipmentId}`);

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

    logger.info(`✅ Started ${equipment.length} Firebase listeners with real-time metric calculations`);
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