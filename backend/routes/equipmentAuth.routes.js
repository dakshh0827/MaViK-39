// backend/routes/equipmentAuth.routes.js

import express from "express";
import equipmentAuthController from "../controllers/equipmentAuth.controller.js";
import authMiddleware from "../middlewares/auth.js";
import { body } from "express-validator";

const router = express.Router();

// Validation middleware
const authenticationValidation = [
  body("aadhaarNumber")
    .isLength({ min: 12, max: 12 })
    .isNumeric()
    .withMessage("Valid 12-digit Aadhaar number is required"),
  body("biometricData")
    .notEmpty()
    .withMessage("Biometric data is required"),
  body("equipmentId")
    .notEmpty()
    .withMessage("Equipment ID is required"),
];

// Public route - Student authentication (no JWT required for biometric kiosk)
router.post(
  "/authenticate",
  authenticationValidation,
  equipmentAuthController.authenticateStudent
);

// Protected routes (require trainer/lab manager authentication)
router.use(authMiddleware);

// Revoke access (lock equipment)
router.post(
  "/revoke/:equipmentId",
  equipmentAuthController.revokeAccess
);

// Check equipment status
router.get(
  "/status/:equipmentId",
  equipmentAuthController.checkEquipmentStatus
);

// Get access logs
router.get(
  "/logs/:equipmentId",
  equipmentAuthController.getAccessLogs
);

export default router;