/*
 * =====================================================
 * backend/controllers/monitoring.controller.js (FIXED)
 * =====================================================
 */
import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import { filterDataByRole } from "../middlewares/rbac.js";
import {
  broadcastAlert,
  broadcastNotification,
  broadcastEquipmentStatus,
} from "../config/socketio.js";
import {
  ALERT_SEVERITY,
  ALERT_TYPE,
  NOTIFICATION_TYPE,
  USER_ROLE_ENUM,
} from "../utils/constants.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Gets the high-level, centralized dashboard for Policy Makers.
 */
const getPolicyMakerDashboard = async () => {
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    logger.info("📊 Fetching Policy Maker Dashboard data...");

    // 1. Get high-level overview stats
    const [
      totalEquipment,
      unresolvedAlerts,
      maintenanceDue,
      avgHealthScore,
      totalInstitutes,
    ] = await Promise.all([
      prisma.equipment.count({ where: { isActive: true } }),
      prisma.alert.count({ where: { isResolved: false } }),
      prisma.maintenanceLog.count({
        where: {
          status: { in: ["SCHEDULED", "OVERDUE"] },
          scheduledDate: { lte: sevenDaysFromNow },
          equipment: { isActive: true },
        },
      }),
      prisma.equipmentStatus.aggregate({
        _avg: { healthScore: true },
        where: { equipment: { isActive: true } },
      }),
      prisma.institute.count(),
    ]);

    logger.info(
      `✅ Basic stats fetched: ${totalEquipment} equipment, ${unresolvedAlerts} alerts`
    );

    // 2. Get all institutes with their labs
    const institutes = await prisma.institute.findMany({
      select: {
        id: true,
        instituteId: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    logger.info(`✅ Found ${institutes.length} institutes`);

    // 3. Get lab counts per institute
    const labCounts = await prisma.lab.groupBy({
      by: ["instituteId"],
      _count: {
        _all: true,
      },
    });

    const labCountMap = labCounts.reduce((acc, item) => {
      acc[item.instituteId] = item._count._all;
      return acc;
    }, {});

    logger.info("✅ Lab counts calculated");

    // 4. Get equipment counts per institute
    const equipmentByInstitute = await prisma.equipment.findMany({
      where: {
        isActive: true,
      },
      select: {
        lab: {
          select: {
            instituteId: true,
          },
        },
      },
    });

    const equipmentCountMap = equipmentByInstitute.reduce((acc, eq) => {
      const instId = eq.lab?.instituteId;
      if (instId) {
        acc[instId] = (acc[instId] || 0) + 1;
      }
      return acc;
    }, {});

    logger.info("✅ Equipment counts calculated");

    // 5. Get alert counts per institute
    const alertsByInstitute = await prisma.alert.findMany({
      where: {
        isResolved: false,
      },
      select: {
        equipment: {
          select: {
            lab: {
              select: {
                instituteId: true,
              },
            },
          },
        },
      },
    });

    const alertCountMap = alertsByInstitute.reduce((acc, alert) => {
      const instId = alert.equipment?.lab?.instituteId;
      if (instId) {
        acc[instId] = (acc[instId] || 0) + 1;
      }
      return acc;
    }, {});

    logger.info("✅ Alert counts calculated");

    // 6. Combine all data
    const institutionsData = institutes.map((inst) => ({
      name: inst.name,
      instituteId: inst.instituteId,
      labCount: labCountMap[inst.instituteId] || 0,
      equipmentCount: equipmentCountMap[inst.instituteId] || 0,
      unresolvedAlerts: alertCountMap[inst.instituteId] || 0,
    }));

    const result = {
      overview: {
        totalInstitutions: totalInstitutes,
        totalEquipment,
        unresolvedAlerts,
        maintenanceDue,
        avgHealthScore: Math.round(avgHealthScore._avg.healthScore || 0),
      },
      institutions: institutionsData,
    };

    logger.info("✅ Policy Maker Dashboard data compiled successfully");
    return result;
  } catch (error) {
    logger.error("❌ Error in getPolicyMakerDashboard:", error);
    throw error;
  }
};

/**
 * Gets the institute-specific dashboard for Lab Managers and Trainers.
 */
const getLabTechAndUserDashboard = async (roleFilter) => {
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    logger.info("📊 Fetching Lab Manager/Trainer Dashboard data...");

    const [
      totalEquipment,
      activeEquipment,
      unresolvedAlerts,
      maintenanceDue,
      avgHealthScore,
      recentAlerts,
      equipmentByStatus,
    ] = await Promise.all([
      prisma.equipment.count({ where: { ...roleFilter, isActive: true } }),
      prisma.equipmentStatus.count({
        where: {
          status: { in: ["OPERATIONAL", "IN_USE"] },
          equipment: { ...roleFilter, isActive: true },
        },
      }),
      prisma.alert.count({
        where: {
          isResolved: false,
          equipment: roleFilter,
        },
      }),
      prisma.maintenanceLog.count({
        where: {
          status: { in: ["SCHEDULED", "OVERDUE"] },
          scheduledDate: { lte: sevenDaysFromNow },
          equipment: { ...roleFilter, isActive: true },
        },
      }),
      prisma.equipmentStatus.aggregate({
        _avg: { healthScore: true },
        where: { equipment: { ...roleFilter, isActive: true } },
      }),
      prisma.alert.findMany({
        where: {
          isResolved: false,
          equipment: roleFilter,
        },
        include: {
          equipment: {
            select: {
              equipmentId: true,
              name: true,
              lab: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.equipmentStatus.groupBy({
        by: ["status"],
        where: { equipment: { ...roleFilter, isActive: true } },
        _count: true,
      }),
    ]);

    logger.info("✅ Lab Manager/Trainer Dashboard data compiled successfully");

    return {
      overview: {
        totalEquipment,
        activeEquipment,
        unresolvedAlerts,
        maintenanceDue,
        avgHealthScore: Math.round(avgHealthScore._avg.healthScore || 0),
      },
      recentAlerts,
      equipmentByStatus: equipmentByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
    };
  } catch (error) {
    logger.error("❌ Error in getLabTechAndUserDashboard:", error);
    throw error;
  }
};

class MonitoringController {
  getRealtimeStatus = asyncHandler(async (req, res) => {
    const roleFilter = filterDataByRole(req);
    const equipmentStatus = await prisma.equipment.findMany({
      where: { ...roleFilter, isActive: true },
      include: {
        status: true,
        lab: {
          select: {
            name: true,
            instituteId: true,
            institute: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      data: equipmentStatus.map((eq) => ({
        id: eq.id,
        equipmentId: eq.equipmentId,
        name: eq.name,
        department: eq.department,
        labName: eq.lab.name,
        institute: eq.lab.institute?.name || eq.lab.instituteId,
        status: eq.status?.status || "OFFLINE",
        healthScore: eq.status?.healthScore || 0,
        temperature: eq.status?.temperature,
        vibration: eq.status?.vibration,
        energyConsumption: eq.status?.energyConsumption,
        lastUsedAt: eq.status?.lastUsedAt,
        updatedAt: eq.status?.updatedAt,
      })),
    });
  });

  getSensorData = asyncHandler(async (req, res) => {
    const { equipmentId } = req.params;
    const { hours = 24 } = req.query;
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    const equipment = await prisma.equipment.findUnique({
      where: { equipmentId },
      select: { id: true },
    });
    if (!equipment) {
      return res
        .status(404)
        .json({ success: false, message: "Equipment not found." });
    }

    const roleFilter = filterDataByRole(req);
    const hasAccess = await prisma.equipment.findFirst({
      where: { id: equipment.id, ...roleFilter },
    });
    if (!hasAccess) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied to this equipment." });
    }

    const sensorData = await prisma.sensorData.findMany({
      where: {
        equipmentId: equipment.id,
        timestamp: { gte: timeThreshold },
      },
      orderBy: { timestamp: "asc" },
    });

    res.json({
      success: true,
      data: sensorData,
    });
  });

  updateEquipmentStatus = asyncHandler(async (req, res) => {
    const { equipmentId } = req.params;
    const {
      status,
      temperature,
      vibration,
      energyConsumption,
      pressure,
      humidity,
      rpm,
      voltage,
      current,
    } = req.body;

    const equipment = await prisma.equipment.findFirst({
      where: { equipmentId },
      select: {
        id: true,
        name: true,
        labId: true,
        lab: {
          select: {
            instituteId: true,
            institute: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found.",
      });
    }

    const equipmentInternalId = equipment.id;

    const updatedStatus = await prisma.equipmentStatus.upsert({
      where: { equipmentId: equipmentInternalId },
      update: {
        ...(status && { status }),
        ...(temperature !== undefined && { temperature }),
        ...(vibration !== undefined && { vibration }),
        ...(energyConsumption !== undefined && { energyConsumption }),
        lastUsedAt: new Date(),
      },
      create: {
        equipmentId: equipmentInternalId,
        status: status || "OPERATIONAL",
        temperature,
        vibration,
        energyConsumption,
      },
    });

    await prisma.sensorData.create({
      data: {
        equipmentId: equipmentInternalId,
        temperature,
        vibration,
        energyConsumption,
        pressure,
        humidity,
        rpm,
        voltage,
        current,
      },
    });

    const equipmentInfo = {
      id: equipment.id,
      name: equipment.name,
      labId: equipment.labId,
      institute: equipment.lab.institute?.name || equipment.lab.instituteId,
    };

    this.checkAnomalies(equipmentInfo, req.body).catch((err) => {
      logger.error("Failed to check anomalies:", err);
    });

    broadcastEquipmentStatus(equipmentInternalId, updatedStatus);

    res.json({
      success: true,
      message: "Equipment status updated successfully.",
      data: updatedStatus,
    });
  });

  checkAnomalies = async (equipment, sensorData) => {
    try {
      const {
        id: equipmentId,
        name: equipmentName,
        labId,
        institute,
      } = equipment;
      const alertsToCreate = [];

      if (sensorData.temperature && sensorData.temperature > 80) {
        alertsToCreate.push({
          equipmentId,
          type: ALERT_TYPE.HIGH_TEMPERATURE,
          severity:
            sensorData.temperature > 100
              ? ALERT_SEVERITY.CRITICAL
              : ALERT_SEVERITY.HIGH,
          title: `High Temperature: ${equipmentName}`,
          message: `Temperature reached ${sensorData.temperature}°C.`,
        });
      }
      if (sensorData.vibration && sensorData.vibration > 10) {
        alertsToCreate.push({
          equipmentId,
          type: ALERT_TYPE.ABNORMAL_VIBRATION,
          severity:
            sensorData.vibration > 15
              ? ALERT_SEVERITY.CRITICAL
              : ALERT_SEVERITY.HIGH,
          title: `Abnormal Vibration: ${equipmentName}`,
          message: `Vibration detected at ${sensorData.vibration} mm/s.`,
        });
      }

      if (alertsToCreate.length === 0) return;

      const usersToNotify = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { role: USER_ROLE_ENUM.POLICY_MAKER },
            { role: USER_ROLE_ENUM.LAB_MANAGER, instituteId: institute },
            { role: USER_ROLE_ENUM.TRAINER, labId: labId },
          ],
        },
        select: { id: true },
      });

      const userIds = usersToNotify.map((u) => u.id);

      for (const alertData of alertsToCreate) {
        const newAlert = await prisma.alert.create({
          data: {
            ...alertData,
            notifications: {
              create: userIds.map((userId) => ({
                userId: userId,
                title: alertData.title,
                message: alertData.message,
                type: NOTIFICATION_TYPE.ALERT,
              })),
            },
          },
          include: {
            notifications: true,
            equipment: {
              select: {
                name: true,
                equipmentId: true,
                lab: { select: { name: true } },
              },
            },
          },
        });

        broadcastAlert(newAlert);

        for (const notification of newAlert.notifications) {
          broadcastNotification(notification.userId, notification);
        }
        logger.info(
          `Alert created and notifications sent for equipment ${equipmentId}`
        );
      }
    } catch (error) {
      logger.error("Check anomalies service error:", error);
    }
  };

  getDashboardOverview = asyncHandler(async (req, res) => {
    try {
      const { role } = req.user;

      logger.info(`📊 Dashboard overview requested by user role: ${role}`);

      let data;
      if (role === USER_ROLE_ENUM.POLICY_MAKER) {
        data = await getPolicyMakerDashboard();
      } else {
        const roleFilter = filterDataByRole(req);
        data = await getLabTechAndUserDashboard(roleFilter);
      }

      logger.info("✅ Dashboard overview fetched successfully");

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error("❌ Error in getDashboardOverview:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard overview",
        error: error.message,
      });
    }
  });

  getLabAnalytics = asyncHandler(async (req, res) => {
    const { labId } = req.params;
    const {
      role,
      instituteId: userInstituteId,
      department: userDepartment,
      labId: userLabId,
    } = req.user;

    try {
      logger.info(`📊 Fetching analytics for lab: ${labId} by ${role}`);

      // Get lab details
      const lab = await prisma.lab.findUnique({
        where: { labId },
        include: {
          institute: {
            select: {
              name: true,
              instituteId: true,
            },
          },
        },
      });

      if (!lab) {
        return res.status(404).json({
          success: false,
          message: "Lab not found.",
        });
      }

      // Access Control
      if (role === "LAB_MANAGER") {
        if (
          lab.instituteId !== userInstituteId ||
          lab.department !== userDepartment
        ) {
          return res.status(403).json({
            success: false,
            message: "Access denied to this lab.",
          });
        }
      } else if (role === "TRAINER") {
        if (lab.id !== userLabId) {
          return res.status(403).json({
            success: false,
            message: "Access denied to this lab.",
          });
        }
      }

      // Fetch all equipment in this lab with their analytics
      const equipment = await prisma.equipment.findMany({
        where: {
          labId: lab.id,
          isActive: true,
        },
        include: {
          status: true,
          analyticsParams: true,
          lab: {
            select: {
              name: true,
              department: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      logger.info(`📦 Found ${equipment.length} equipment in lab`);

      // Calculate aggregate statistics
      const statistics = {
        totalEquipment: equipment.length,
        avgHealthScore: 0,
        totalUptime: 0,
        totalDowntime: 0,
        avgEfficiency: 0,
        avgUtilization: 0,
        operationalCount: 0,
        inUseCount: 0,
        maintenanceCount: 0,
        faultyCount: 0,
        offlineCount: 0,
        inClassEquipment: 0,
      };

      let healthScoreSum = 0;
      let efficiencySum = 0;
      let utilizationSum = 0;
      let equipmentWithData = 0;

      equipment.forEach((eq) => {
        // Status counts
        const status = eq.status?.status || "OFFLINE";
        switch (status) {
          case "OPERATIONAL":
            statistics.operationalCount++;
            break;
          case "IN_USE":
            statistics.inUseCount++;
            break;
          case "IN_CLASS":
            statistics.inClassEquipment++;
            break;
          case "MAINTENANCE":
            statistics.maintenanceCount++;
            break;
          case "FAULTY":
            statistics.faultyCount++;
            break;
          default:
            statistics.offlineCount++;
        }

        // Health score
        if (eq.status?.healthScore) {
          healthScoreSum += eq.status.healthScore;
        }

        // Analytics data
        if (eq.analyticsParams) {
          equipmentWithData++;
          statistics.totalUptime += eq.analyticsParams.totalUptime || 0;
          statistics.totalDowntime += eq.analyticsParams.totalDowntime || 0;

          if (eq.analyticsParams.efficiency) {
            efficiencySum += eq.analyticsParams.efficiency;
          }

          if (eq.analyticsParams.utilizationRate) {
            utilizationSum += eq.analyticsParams.utilizationRate;
          }
        }
      });

      if (equipment.length > 0) {
        statistics.avgHealthScore = healthScoreSum / equipment.length;
      }

      if (equipmentWithData > 0) {
        statistics.avgEfficiency = efficiencySum / equipmentWithData;
        statistics.avgUtilization = utilizationSum / equipmentWithData;
      }

      // Department-specific analytics aggregation (Same as before, omitted for brevity but preserved)
      const departmentMetrics = {
        temperature: [],
        vibration: [],
        voltage: [],
        current: [],
        powerFactor: [],
        efficiency: [],
        spindleSpeed: [],
        feedRate: [],
        toolWear: [],
        printQuality: [],
        solarEfficiency: [],
        testAccuracy: [],
      };

      equipment.forEach((eq) => {
        if (eq.analyticsParams) {
          const params = eq.analyticsParams;
          if (params.temperature !== null) departmentMetrics.temperature.push(params.temperature);
          if (params.vibration !== null) departmentMetrics.vibration.push(params.vibration);
          if (params.voltage !== null) departmentMetrics.voltage.push(params.voltage);
          if (params.current !== null) departmentMetrics.current.push(params.current);
          if (params.powerFactor !== null) departmentMetrics.powerFactor.push(params.powerFactor);
          if (params.efficiency !== null) departmentMetrics.efficiency.push(params.efficiency);
          if (params.spindleSpeed !== null) departmentMetrics.spindleSpeed.push(params.spindleSpeed);
          if (params.feedRate !== null) departmentMetrics.feedRate.push(params.feedRate);
          if (params.toolWear !== null) departmentMetrics.toolWear.push(params.toolWear);
          if (params.printQuality !== null) departmentMetrics.printQuality.push(params.printQuality);
          if (params.solarEfficiency !== null) departmentMetrics.solarEfficiency.push(params.solarEfficiency);
          if (params.testAccuracy !== null) departmentMetrics.testAccuracy.push(params.testAccuracy);
        }
      });

      const avgDepartmentMetrics = {};
      Object.keys(departmentMetrics).forEach((key) => {
        const values = departmentMetrics[key];
        if (values.length > 0) {
          avgDepartmentMetrics[key] = {
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            count: values.length,
          };
        }
      });

      res.json({
        success: true,
        data: {
          lab: {
            labId: lab.labId,
            name: lab.name,
            department: lab.department,
            institute: lab.institute,
          },
          statistics,
          departmentMetrics: avgDepartmentMetrics,
          equipment: equipment.map((eq) => ({
            id: eq.id,
            equipmentId: eq.equipmentId,
            name: eq.name,
            department: eq.department,
            manufacturer: eq.manufacturer,
            model: eq.model,
            status: eq.status,
            analyticsParams: eq.analyticsParams,
            lastUsedAt: eq.status?.lastUsedAt,
            // ✅ ADDED THESE 3 LINES:
            isLocked: eq.isLocked,
            requiresAuthentication: eq.requiresAuthentication,
            currentUserId: eq.currentUserId,
          })),
        },
      });
    } catch (error) {
      logger.error("❌ Error fetching lab analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch lab analytics",
        error: error.message,
      });
    }
  });
}

export default new MonitoringController();