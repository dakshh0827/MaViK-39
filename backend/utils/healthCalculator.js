// backend/utils/healthCalculator.js

export const calculateHealthAndEfficiency = (temp, vib, energy) => {
  // Thresholds
  const T_MAX = 85, T_WARN = 60;
  const V_MAX = 8, V_WARN = 3; 
  const E_MAX = 450, E_WARN = 200;

  let healthDeduction = 0;
  let efficiencyDeduction = 0;

  // Temperature Penalty
  if (temp > T_WARN) {
      const penalty = Math.min(1, Math.max(0, (temp - T_WARN) / (T_MAX - T_WARN)));
      healthDeduction += penalty * 40; // Max 40% impact
      efficiencyDeduction += penalty * 20; // Max 20% impact
  }

  // Vibration Penalty (Highest Impact)
  if (vib > V_WARN) {
      const penalty = Math.min(1, Math.max(0, (vib - V_WARN) / (V_MAX - V_WARN)));
      healthDeduction += penalty * 50; // Max 50% impact
      efficiencyDeduction += penalty * 50; // Max 50% impact
  }

  // Energy Penalty
  if (energy > E_WARN) {
       const penalty = Math.min(1, Math.max(0, (energy - E_WARN) / (E_MAX - E_WARN)));
       healthDeduction += penalty * 10; // Max 10% impact
       efficiencyDeduction += penalty * 30; // Max 30% impact
  }

  const healthScore = Math.round(Math.max(0, Math.min(100, 100 - healthDeduction)));
  const efficiency = Math.round(Math.max(0, Math.min(100, 100 - efficiencyDeduction)));

  return { healthScore, efficiency };
};

export const FAULT_THRESHOLDS = {
  temperature: { critical: 85, warning: 75 },
  vibration: { critical: 8, warning: 6 },
  energyConsumption: { critical: 450, warning: 400 }
};

export const detectFault = (temperature, vibration, energyConsumption) => {
  let isFaulty = false;
  let severity = 'LOW';
  let reasons = [];

  if (temperature >= FAULT_THRESHOLDS.temperature.critical) {
    isFaulty = true; severity = 'CRITICAL'; reasons.push(`Critical temp: ${temperature}°C`);
  } else if (temperature >= FAULT_THRESHOLDS.temperature.warning) {
    isFaulty = true; if (severity !== 'CRITICAL') severity = 'HIGH'; reasons.push(`High temp: ${temperature}°C`);
  }

  if (vibration >= FAULT_THRESHOLDS.vibration.critical) {
    isFaulty = true; severity = 'CRITICAL'; reasons.push(`Critical vib: ${vibration} mm/s`);
  } else if (vibration >= FAULT_THRESHOLDS.vibration.warning) {
    isFaulty = true; if (severity !== 'CRITICAL') severity = 'HIGH'; reasons.push(`High vib: ${vibration} mm/s`);
  }

  if (energyConsumption >= FAULT_THRESHOLDS.energyConsumption.critical) {
    isFaulty = true; severity = 'CRITICAL'; reasons.push(`Critical energy: ${energyConsumption}W`);
  } else if (energyConsumption >= FAULT_THRESHOLDS.energyConsumption.warning) {
    isFaulty = true; if (severity !== 'CRITICAL' && severity !== 'HIGH') severity = 'MEDIUM'; reasons.push(`High energy: ${energyConsumption}W`);
  }

  return { isFaulty, severity, reasons: reasons.join(', ') };
};