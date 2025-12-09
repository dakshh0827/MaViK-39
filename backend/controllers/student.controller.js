// backend/controllers/student.controller.js

import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import crypto from "crypto";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper: Hash biometric data
const hashBiometric = (biometricData) => {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(biometricData))
    .digest("hex");
};

class StudentController {
  // Register a new student
  registerStudent = asyncHandler(async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      phone,
      aadhaarNumber,
      biometricData,
      instituteId,
      department,
      labId,
      enrollmentNumber,
      courseType,
      batchYear,
    } = req.body;

    // Check if student already exists
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { aadhaarNumber },
          { email },
          { enrollmentNumber },
        ],
      },
    });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "Student already registered with this Aadhaar, email, or enrollment number.",
      });
    }

    // Find lab
    const lab = await prisma.lab.findUnique({
      where: { labId },
    });

    if (!lab) {
      return res.status(404).json({
        success: false,
        message: "Lab not found.",
      });
    }

    // Hash biometric data
    const biometricHash = hashBiometric(biometricData);

    // Create student
    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        aadhaarNumber,
        biometricHash,
        biometricType: "FINGERPRINT",
        aadhaarVerified: true, // Set to true after UIDAI verification
        instituteId,
        department,
        labId: lab.id,
        enrollmentNumber,
        courseType,
        batchYear,
      },
      include: {
        lab: {
          select: {
            labId: true,
            name: true,
          },
        },
        institute: {
          select: {
            instituteId: true,
            name: true,
          },
        },
      },
    });

    logger.info(`✅ Student registered: ${student.id}`);

    return res.status(201).json({
      success: true,
      message: "Student registered successfully.",
      data: student,
    });
  });

  // Get all students (with filters)
  getAllStudents = asyncHandler(async (req, res) => {
    const { instituteId, department, labId, isActive, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (instituteId) where.instituteId = instituteId;
    if (department) where.department = department;
    if (labId) {
      const lab = await prisma.lab.findUnique({ where: { labId } });
      if (lab) where.labId = lab.id;
    }
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          lab: {
            select: {
              labId: true,
              name: true,
            },
          },
          institute: {
            select: {
              instituteId: true,
              name: true,
            },
          },
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.student.count({ where }),
    ]);

    return res.json({
      success: true,
      data: students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // Get student by ID
  getStudentById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        lab: true,
        institute: true,
        accessLogs: {
          include: {
            equipment: {
              select: {
                equipmentId: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // Remove sensitive data
    delete student.biometricHash;

    return res.json({
      success: true,
      data: student,
    });
  });

  // Update student
  updateStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.aadhaarNumber;
    delete updateData.biometricHash;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // If new biometric data is provided, hash it
    if (updateData.biometricData) {
      updateData.biometricHash = hashBiometric(updateData.biometricData);
      delete updateData.biometricData;
    }

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        lab: true,
        institute: true,
      },
    });

    logger.info(`✅ Student updated: ${id}`);

    return res.json({
      success: true,
      message: "Student updated successfully.",
      data: student,
    });
  });

  // Delete student (soft delete)
  deleteStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.student.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`✅ Student deactivated: ${id}`);

    return res.json({
      success: true,
      message: "Student deactivated successfully.",
    });
  });

  // Get student access history
  getStudentAccessHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const logs = await prisma.equipmentAccessLog.findMany({
      where: { studentId: id },
      include: {
        equipment: {
          select: {
            equipmentId: true,
            name: true,
            lab: {
              select: {
                labId: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    return res.json({
      success: true,
      data: logs,
    });
  });
}

export default new StudentController();