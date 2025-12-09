// backend/services/firebase.service.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import { broadcastEquipmentStatus, broadcastAlert } from "../config/socketio.js";
import { ALERT_TYPE, NOTIFICATION_TYPE, USER_ROLE_ENUM } from "../utils/constants.js";

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

// FAULT DETECTION THRESHOLDS (Temp & Vibration)
const FAULT_THRESHOLDS = {
  temperature: {
    critical: 85, // degrees Celsius
    warning: 75,
  },
  vibration: {
    critical: 10.0, // mm/s
    warning: 6.0,
  }
};

// Calculate Health & Efficiency based on Temp & Vibration
const calculateMetrics = (temp, vib) => {
  const t = parseFloat(temp) || 0;
  const v = parseFloat(vib) || 0;

  // --- Health Score Calculation ---
  let healthPenalties = 0;
  
  // Temperature Penalty (> 60°C starts reducing health)
  if (t > 60) healthPenalties += (t - 60) * 1.2;
  
  // Vibration Penalty (> 2.0 mm/s starts reducing health)
  if (v > 2.0) healthPenalties += (v - 2.0) * 4.0;

  const healthScore = Math.max(0, Math.min(100, 100 - healthPenalties));

  // --- Efficiency Calculation ---
  let efficiencyPenalties = 0;
  
  // Temp Penalty (> 70°C impacts efficiency)
  if (t > 70) efficiencyPenalties += (t - 70) * 2;
  
  // Vibration Penalty (> 3.0 mm/s impacts efficiency)
  if (v > 3.0) efficiencyPenalties += (v - 3.0) * 5;

  const efficiency = Math.max(0, Math.min(100, 100 - efficiencyPenalties));

  return { 
    healthScore: parseFloat(healthScore.toFixed(1)), 
    efficiency: parseFloat(efficiency.toFixed(1)) 
  };
};

// Helper: Check if equipment is faulty
const detectFault = (temperature, vibration) => {
  const t = parseFloat(temperature);
  const v = parseFloat(vibration);
  let isFaulty = false;
  let severity = 'LOW';
  let reasons = [];

  // Check Temperature
  if (t >= FAULT_THRESHOLDS.temperature.critical) {
    isFaulty = true;
    severity = 'CRITICAL';
    reasons.push(`Critical Temp: ${t}°C`);
  } else if (t >= FAULT_THRESHOLDS.temperature.warning) {
    isFaulty = true;
    severity = 'HIGH';
    reasons.push(`High Temp: ${t}°C`);
  }

  // Check Vibration
  if (v >= FAULT_THRESHOLDS.vibration.critical) {
    isFaulty = true;
    severity = 'CRITICAL';
    reasons.push(`Critical Vib: ${v}mm/s`);
  } else if (v >= FAULT_THRESHOLDS.vibration.warning) {
    isFaulty = true;
    severity = (severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH'; // Don't downgrade severity
    reasons.push(`High Vib: ${v}mm/s`);
  }

  return { isFaulty, severity, reasons: reasons.join(', ') };
};

class FirebaseService {
  constructor() {
    this.activeListeners = new Map();
  }

  async startListening(firebaseDeviceId, equipmentId) {
    if (this.activeListeners.has(firebaseDeviceId)) {
      return;
    }

    // LISTENING PATH: UsersData/{DEVICE_ID}/readings
    const deviceRef = ref(db, `UsersData/${firebaseDeviceId}/readings`);
    
    logger.info(`📡 Setting up listener for: UsersData/${firebaseDeviceId}/readings`);

    const unsubscribe = onValue(
      deviceRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          // Get the keys (e.g., "15", "32", "102")
          const keys = Object.keys(data);
          
          if (keys.length === 0) return;

          // Find the largest key (assuming keys are growing counters)
          const latestKey = keys.sort((a, b) => parseInt(a) - parseInt(b)).pop();
          const latestReading = data[latestKey];

          // Process using server time for timestamp
          await this.processReading(equipmentId, latestReading, firebaseDeviceId, latestKey);
        }
      },
      (error) => {
        logger.error(`❌ Firebase listener error for ${firebaseDeviceId}:`, error);
      }
    );

    this.activeListeners.set(firebaseDeviceId, unsubscribe);
    logger.info(`✅ Firebase listener active for ${firebaseDeviceId}`);
  }

  async processReading(equipmentId, reading, firebaseDeviceId, rawKey) {
    try {
      // 1. EXTRACT DATA
      const temperature = parseFloat(reading.temperature);
      const vibration = parseFloat(reading.vibration) || 0.0; // Default to 0 if missing

      if (isNaN(temperature)) {
        return; // Skip if no valid temp
      }

      // 2. TIMESTAMP: Use Current Server Time
      const readingTimestamp = new Date(); 

      // 3. CALCULATE METRICS
      const { healthScore, efficiency } = calculateMetrics(temperature, vibration);

      // 4. FAULT DETECTION
      const faultCheck = detectFault(temperature, vibration);

      // 5. STORE IN DB (SensorData)
      await prisma.sensorData.create({
        data: {
          equipment: { connect: { id: equipmentId } },
          temperature,
          vibration,
          energyConsumption: 0.0, // Keeping 0 as we focus on temp/vib
          timestamp: readingTimestamp,
          isAnomaly: faultCheck.isFaulty,
          anomalyScore: faultCheck.isFaulty ? 
            (faultCheck.severity === 'CRITICAL' ? 100 : faultCheck.severity === 'HIGH' ? 80 : 60) : 
            null
        }
      });

      // 6. UPDATE EQUIPMENT STATUS
      const updatedStatus = await prisma.equipmentStatus.update({
        where: { equipmentId },
        data: {
          temperature,
          vibration, 
          energyConsumption: 0.0,
          healthScore,
          lastUsedAt: readingTimestamp,
          status: faultCheck.isFaulty ? 'FAULTY' : 'OPERATIONAL',
        },
        include: { equipment: true }
      });

      // 7. UPDATE ANALYTICS
      await prisma.departmentAnalytics.updateMany({
        where: { equipmentId },
        data: {
          temperature,
          vibration,
          efficiency,
        }
      });

      // 8. BROADCAST VIA SOCKET
      broadcastEquipmentStatus(equipmentId, {
        id: equipmentId, 
        equipmentId: equipmentId,
        status: updatedStatus.status,
        healthScore,
        efficiency,
        temperature,
        vibration,
        energyConsumption: 0.0,
        firebaseDeviceId: firebaseDeviceId,
        readingTimestamp: readingTimestamp.toISOString(),
        updatedAt: new Date()
      });

      logger.info(`✅ Synced ${firebaseDeviceId} (Key: ${rawKey}): T:${temperature}°C, V:${vibration}mm/s`);

    } catch (error) {
      logger.error(`❌ Error processing reading for ${equipmentId}:`, error);
    }
  }

  async startAllListeners() {
    const equipment = await prisma.equipment.findMany({
      where: { firebaseDeviceId: { not: null }, isActive: true },
      select: { id: true, firebaseDeviceId: true }
    });

    for (const eq of equipment) {
      await this.startListening(eq.firebaseDeviceId, eq.id);
    }
    logger.info(`✅ Started ${equipment.length} listeners.`);
  }
}

export default new FirebaseService();