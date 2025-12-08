// backend/controllers/equipment.controller.js

import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import { filterDataByRole } from "../middlewares/rbac.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// --- METRICS CALCULATION FORMULA ---
export const calculateMetrics = (temp, vib, energy) => {
  // Default baselines
  const t = temp || 0;
  const v = vib || 0;
  const e = energy || 0;

  // --- Health Score Calculation ---
  // Baseline: 100
  // Penalties:
  // - Temperature: -1.5 point for every degree above 50°C
  // - Vibration: -5 points for every unit of vibration
  // - Energy: Small penalty for very high consumption (assuming > 500 is stress)
  let healthPenalties = 0;
  
  if (t > 50) healthPenalties += (t - 50) * 1.5;
  healthPenalties += v * 5; 
  if (e > 500) healthPenalties += (e - 500) * 0.05;

  const healthScore = Math.max(0, Math.min(100, 100 - healthPenalties));

  // --- Efficiency Calculation ---
  // Baseline: 100
  // Efficiency drops significantly with vibration (mechanical loss) and extreme heat (thermal loss)
  let efficiencyPenalties = 0;
  
  efficiencyPenalties += v * 8; // Vibration kills efficiency
  if (t > 60) efficiencyPenalties += (t - 60) * 2; // Thermal loss

  const efficiency = Math.max(0, Math.min(100, 100 - efficiencyPenalties));

  return { 
    healthScore: parseFloat(healthScore.toFixed(1)), 
    efficiency: parseFloat(efficiency.toFixed(1)) 
  };
};

const DEPARTMENT_TO_FIELD_MAP = {
  FITTER_MANUFACTURING: "fitterEquipmentName",
  ELECTRICAL_ENGINEERING: "electricalEquipmentName",
  WELDING_FABRICATION: "weldingEquipmentName",
  TOOL_DIE_MAKING: "toolDieEquipmentName",
  ADDITIVE_MANUFACTURING: "additiveManufacturingEquipmentName",
  SOLAR_INSTALLER_PV: "solarInstallerEquipmentName",
  MATERIAL_TESTING_QUALITY: "materialTestingEquipmentName",
  ADVANCED_MANUFACTURING_CNC: "advancedManufacturingEquipmentName",
  AUTOMOTIVE_MECHANIC: "automotiveEquipmentName",
};

const buildDepartmentField = (department, equipmentName) => {
  const fieldName = DEPARTMENT_TO_FIELD_MAP[department];
  if (!fieldName || !equipmentName) {
    return {};
  }
  return { [fieldName]: equipmentName };
};

const clearAllDepartmentFields = () => {
  const clearFields = {};
  Object.values(DEPARTMENT_TO_FIELD_MAP).forEach((field) => {
    clearFields[field] = null;
  });
  return clearFields;
};

class EquipmentController {
  // Get all equipment
  getAllEquipment = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      department,
      status,
      institute,
      labId,
      search,
    } = req.query;
    const skip = (page - 1) * limit;

    const roleFilter = filterDataByRole(req);

    const where = {
      ...roleFilter,
      ...(department && { department }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { equipmentId: { contains: search, mode: "insensitive" } },
          { manufacturer: { contains: search, mode: "insensitive" } },
        ],
      }),
      isActive: true,
    };

    if (labId && req.user.role !== "TRAINER") {
      const lab = await prisma.lab.findUnique({ where: { labId } });
      if (lab) where.labId = lab.id;
    }

    if (req.user.role !== "TRAINER" && institute) {
      where.lab = { ...(where.lab || {}), institute };
    }

    if (status) {
      where.status = { status: status };
    }

    try {
      const [equipmentRaw, total] = await Promise.all([
        prisma.equipment.findMany({
          where,
          include: {
            status: true,
            analyticsParams: true, // Needed for calculation
            lab: {
              select: {
                labId: true,
                name: true,
                institute: true,
                department: true,
              },
            },
            _count: {
              select: {
                alerts: { where: { isResolved: false } },
                maintenanceLogs: true,
              },
            },
          },
          skip: parseInt(skip),
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
        }),
        prisma.equipment.count({ where }),
      ]);

      // Calculate Metrics dynamically
      const equipment = equipmentRaw.map(eq => {
        const params = eq.analyticsParams || {};
        const statusObj = eq.status || {};
        
        // Use params if available, else status (for backward compatibility)
        const temp = params.temperature ?? statusObj.temperature ?? 0;
        const vib = params.vibration ?? statusObj.vibration ?? 0;
        const energy = params.energyConsumption ?? statusObj.energyConsumption ?? 0;

        const { healthScore, efficiency } = calculateMetrics(temp, vib, energy);

        return {
          ...eq,
          status: {
            ...eq.status,
            healthScore: healthScore // Override DB value
          },
          analyticsParams: {
            ...eq.analyticsParams,
            efficiency: efficiency // Override DB value
          }
        };
      });

      res.json({
        success: true,
        data: equipment,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error("Error in getAllEquipment:", error);
      throw error;
    }
  });

  // Get equipment by ID
  getEquipmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const roleFilter = filterDataByRole(req);

    let equipment = await prisma.equipment.findFirst({
      where: { id, ...roleFilter, isActive: true },
      include: {
        status: true,
        lab: {
          select: {
            labId: true,
            name: true,
            institute: true,
            department: true,
          },
        },
        alerts: {
          where: { isResolved: false },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        maintenanceLogs: {
          orderBy: { scheduledDate: "desc" },
          take: 5,
          include: {
            technician: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        usageAnalytics: {
          orderBy: { date: "desc" },
          take: 7,
        },
        analyticsParams: true,
      },
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or access denied.",
      });
    }

    // Dynamic Calculation
    const params = equipment.analyticsParams || {};
    const statusObj = equipment.status || {};
    const temp = params.temperature ?? statusObj.temperature ?? 0;
    const vib = params.vibration ?? statusObj.vibration ?? 0;
    const energy = params.energyConsumption ?? statusObj.energyConsumption ?? 0;

    const { healthScore, efficiency } = calculateMetrics(temp, vib, energy);

    // Apply calculated values
    if (equipment.status) equipment.status.healthScore = healthScore;
    if (equipment.analyticsParams) equipment.analyticsParams.efficiency = efficiency;
    
    // Also inject into root for easier access if needed
    equipment.calculatedHealth = healthScore;
    equipment.calculatedEfficiency = efficiency;

    res.json({
      success: true,
      data: equipment,
    });
  });

  // Create new equipment (unchanged logic mostly, but ensured imports)
  createEquipment = asyncHandler(async (req, res) => {
    const {
      equipmentId,
      name,
      department,
      equipmentName,
      manufacturer,
      model,
      serialNumber,
      purchaseDate,
      warrantyExpiry,
      labId,
      specifications,
      imageUrl,
    } = req.body;

    const existing = await prisma.equipment.findUnique({
      where: { equipmentId },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Equipment ID already exists.",
      });
    }

    if (!labId) {
      return res.status(400).json({
        success: false,
        message: "labId is required.",
      });
    }

    const lab = await prisma.lab.findUnique({
      where: { labId: labId.trim() },
    });

    if (!lab) {
      return res.status(400).json({
        success: false,
        message: `Invalid Lab ID provided: "${labId}".`,
      });
    }

    if (req.user.role === "LAB_MANAGER") {
      if (!req.user.institute || !req.user.department) {
        return res.status(403).json({
            success: false, 
            message: "User account incomplete."
        });
      }
      if (lab.instituteId !== req.user.institute) {
        return res.status(403).json({
          success: false,
          message: "Institute mismatch.",
        });
      }
      if (lab.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: "Department mismatch.",
        });
      }
    }

    if (department !== lab.department) {
      return res.status(400).json({
        success: false,
        message: `Equipment department must match lab department (${lab.department}).`,
      });
    }

    const departmentField = buildDepartmentField(department, equipmentName);

    const equipment = await prisma.equipment.create({
      data: {
        equipmentId,
        name,
        department,
        ...departmentField,
        manufacturer,
        model,
        serialNumber: serialNumber || null,
        purchaseDate: new Date(purchaseDate),
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        labId: lab.id,
        specifications: specifications || null,
        imageUrl: imageUrl || null,
        isActive: true,
        status: {
          create: {
            status: "IDLE",
            healthScore: 100, // Initial default
            isOperatingInClass: false,
          },
        },
        analyticsParams: {
            create: {
                department: department,
                temperature: 25,
                vibration: 0,
                energyConsumption: 0,
                efficiency: 100
            }
        }
      },
      include: {
        status: true,
        analyticsParams: true,
        lab: true,
      },
    });

    logger.info(`Equipment created: ${equipmentId} by ${req.user.email}`);
    res.status(201).json({
      success: true,
      message: "Equipment created successfully.",
      data: equipment,
    });
  });

  // Update equipment
  updateEquipment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      department,
      equipmentName,
      labId,
      purchaseDate,
      warrantyExpiry,
      ...updateData
    } = req.body;

    delete updateData.equipmentId;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.isActive;

    const roleFilter = filterDataByRole(req);
    const existingEquipment = await prisma.equipment.findFirst({
      where: { id, ...roleFilter, isActive: true },
      include: { lab: true },
    });

    if (!existingEquipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or access denied.",
      });
    }

    if (department && department !== existingEquipment.department) {
      Object.assign(updateData, clearAllDepartmentFields());
      updateData.department = department;
      if (equipmentName) {
        Object.assign(
          updateData,
          buildDepartmentField(department, equipmentName)
        );
      }
    } else if (equipmentName) {
      Object.assign(
        updateData,
        buildDepartmentField(existingEquipment.department, equipmentName)
      );
    }

    if (labId && labId !== existingEquipment.lab.labId) {
      const newLab = await prisma.lab.findUnique({
        where: { labId: labId.trim() },
      });

      if (!newLab) {
        return res.status(400).json({
          success: false,
          message: `Invalid Lab ID: "${labId}".`,
        });
      }

      if (req.user.role === "LAB_MANAGER") {
        if (newLab.institute !== req.user.institute || newLab.department !== req.user.department) {
          return res.status(403).json({
            success: false,
            message: "Cannot move equipment outside your jurisdiction.",
          });
        }
      }

      const targetDepartment = updateData.department || existingEquipment.department;
      if (targetDepartment !== newLab.department) {
        return res.status(400).json({
          success: false,
          message: "Department mismatch.",
        });
      }

      updateData.labId = newLab.id;
    }

    if (purchaseDate) updateData.purchaseDate = new Date(purchaseDate);
    if (warrantyExpiry) updateData.warrantyExpiry = new Date(warrantyExpiry);

    const equipment = await prisma.equipment.update({
      where: { id },
      data: updateData,
      include: {
        status: true,
        lab: true,
        analyticsParams: true
      },
    });

    res.json({
      success: true,
      message: "Equipment updated successfully.",
      data: equipment,
    });
  });

  // Delete equipment
  deleteEquipment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const roleFilter = filterDataByRole(req);
    const equipment = await prisma.equipment.findFirst({
      where: { id, ...roleFilter, isActive: true },
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or access denied.",
      });
    }

    await prisma.equipment.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(
      `Equipment deleted: ${equipment.equipmentId} by ${req.user.email}`
    );
    res.json({
      success: true,
      message: "Equipment deleted successfully.",
    });
  });

  // Get equipment statistics
  getEquipmentStats = asyncHandler(async (req, res) => {
    const roleFilter = filterDataByRole(req);
    const statsWhere = {
      ...roleFilter,
      isActive: true,
    };

    const [total, byStatus, byDepartment, criticalAlerts] = await Promise.all([
      prisma.equipment.count({ where: statsWhere }),
      prisma.equipmentStatus.groupBy({
        by: ["status"],
        where: { equipment: statsWhere },
        _count: true,
      }),
      prisma.equipment.groupBy({
        by: ["department"],
        where: statsWhere,
        _count: true,
      }),
      prisma.alert.count({
        where: {
          equipment: statsWhere,
          isResolved: false,
          severity: { in: ["CRITICAL", "HIGH"] },
        },
      }),
    ]);

    const statusCounts = byStatus.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total,
        byStatus: {
          OPERATIONAL: statusCounts.OPERATIONAL || 0,
          IN_USE: statusCounts.IN_USE || 0,
          IN_CLASS: statusCounts.IN_CLASS || 0,
          IDLE: statusCounts.IDLE || 0,
          MAINTENANCE: statusCounts.MAINTENANCE || 0,
          FAULTY: statusCounts.FAULTY || 0,
          OFFLINE: statusCounts.OFFLINE || 0,
          WARNING: statusCounts.WARNING || 0,
        },
        byDepartment: byDepartment.map((d) => ({
          department: d.department,
          count: d._count,
        })),
        criticalAlerts,
      },
    });
  });
}

export default new EquipmentController();