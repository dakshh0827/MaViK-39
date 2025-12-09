import express from "express";
import studentController from "../controllers/student.controller.js";
import authMiddleware from "../middlewares/auth.js";
import { can } from "../middlewares/rbac.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", can.viewStudents, studentController.getAllStudents);
router.post("/", can.manageStudents, studentController.registerStudent);
router.get("/:id", can.viewStudents, studentController.getStudentById);
router.put("/:id", can.manageStudents, studentController.updateStudent);
router.delete("/:id", can.manageStudents, studentController.deleteStudent);
router.get("/:id/access-history", can.viewStudents, studentController.getStudentAccessHistory);

export default router;