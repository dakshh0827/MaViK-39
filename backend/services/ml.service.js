import axios from "axios";
import logger from "../utils/logger.js";

// URL for the Flask ML Service
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "https://dakshh04-MaViK-39-ML-Model.hf.space";

class MLService {
  /**
   * Get predictive maintenance prediction for a single equipment
   * @param {Object} features - The features required by the model
   * @returns {Promise<Object>} - The prediction result
   */
  async getPrediction(features) {
    try {
      // --- RANDOM VALUE GENERATION ---

      // 1. Machine ID: Integer between 1 and 3
      const randomMachineId = Math.floor(Math.random() * 3) + 1;

      // 2. Hourly Usage: Float between 0.1 and 0.5
      // Math.random() generates 0 to 1. We scale it and shift it.
      // Fixed to 2 decimal places for cleaner JSON data.
      const randomHourlyUsage = parseFloat(
        (Math.random() * (0.5 - 0.1) + 0.1).toFixed(2)
      );

      // 3. Type: Randomly pick from [0, 2, 3]
      const typeOptions = [0, 2, 3];
      const randomType =
        typeOptions[Math.floor(Math.random() * typeOptions.length)];

      // -------------------------------

      // Prepare payload matches the exact keys expected by app.py
      const payload = {
        Temperature_C: features.temperature || 0,
        Vibration_mms: features.vibration || 0,
        Energy_Consumption_W: features.energyConsumption || 0,
        Days_Since_Weekly_Maintenance: features.daysSinceMaintenance || 0,

        // New Random Fields
        Machine_ID: randomMachineId,
        Hourly_Usage: randomHourlyUsage,
        Maintenance_Type: randomType,
      };

      // --- ADDED LOGS ---
      logger.info(`🤖 [ML Service] Sending POST to ${ML_SERVICE_URL}/predict`);
      logger.info(
        `📦 [ML Service] Payload: ${JSON.stringify(payload, null, 2)}`
      );
      // ------------------

      const response = await axios.post(`${ML_SERVICE_URL}/predict`, payload, {timeout: 60000});

      // --- LOG RESPONSE ---
      logger.info(`✅ [ML Service] Response: ${JSON.stringify(response.data)}`);
      // --------------------

      return {
        prediction: response.data.prediction, // 0 (No Issue) or 1 (Maintenance Needed)
        probability: response.data.probability_percentage,
        status: "success",
      };
    } catch (error) {
      logger.error(`❌ [ML Service] Error: ${error.message}`);
      if (error.response) {
        logger.error(
          `   Server responded with: ${JSON.stringify(error.response.data)}`
        );
      }
      return {
        prediction: 0,
        probability: 0,
        status: "error",
        error: error.message,
      };
    }
  }
}

export default new MLService();
