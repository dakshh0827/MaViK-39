// backend/controllers/analytics.controller.js
import prisma from "../config/database.js";
import { filterDataByRole } from "../middlewares/rbac.js";
import mlService from "../services/ml.service.js";
import { calculateMetrics } from "./equipment.controller.js"; // Import the formula

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class AnalyticsController {
  // Get Analytics Overview - Updated to calculate real-time averages
  getAnalyticsOverview = asyncHandler(async (req, res) => {
    const roleFilter = filterDataByRole(req);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch aggregates for usage/downtime/energy from historical table (UsageAnalytics)
    const usageAggregates = await prisma.usageAnalytics.aggregate({
      where: {
        equipment: roleFilter,
        date: { gte: thirtyDaysAgo },
      },
      _sum: {
        totalUsageHours: true,
        totalDowntime: true,
        energyConsumed: true,
      },
    });

    // 2. Fetch ALL relevant active equipment to calculate real-time Health & Efficiency
    const equipmentList = await prisma.equipment.findMany({
        where: {
            ...roleFilter,
            isActive: true
        },
        select: {
            id: true,
            analyticsParams: {
                select: {
                    temperature: true,
                    vibration: true,
                    energyConsumption: true
                }
            },
            status: {
                select: {
                    temperature: true,
                    vibration: true,
                    energyConsumption: true
                }
            }
        }
    });

    let totalHealth = 0;
    let totalEfficiency = 0;
    const count = equipmentList.length;

    // Calculate averages based on current sensor data
    equipmentList.forEach(eq => {
        const params = eq.analyticsParams || {};
        const status = eq.status || {};
        
        const temp = params.temperature ?? status.temperature ?? 0;
        const vib = params.vibration ?? status.vibration ?? 0;
        const energy = params.energyConsumption ?? status.energyConsumption ?? 0;

        const { healthScore, efficiency } = calculateMetrics(temp, vib, energy);
        
        totalHealth += healthScore;
        totalEfficiency += efficiency;
    });

    const avgHealthScore = count > 0 ? parseFloat((totalHealth / count).toFixed(1)) : 100;
    const avgEfficiency = count > 0 ? parseFloat((totalEfficiency / count).toFixed(1)) : 100;

    // Get stats counts for dashboard
    const [totalInstitutions, totalEquipment, activeEquipment, unresolvedAlerts, maintenanceDue] = await Promise.all([
        prisma.institute.count(),
        prisma.equipment.count({ where: { ...roleFilter, isActive: true } }),
        prisma.equipment.count({ 
            where: { 
                ...roleFilter, 
                isActive: true, 
                status: { status: { in: ['OPERATIONAL', 'IN_USE', 'IN_CLASS'] } } 
            } 
        }),
        prisma.alert.count({ where: { equipment: roleFilter, isResolved: false } }),
        prisma.equipment.count({
            where: {
                ...roleFilter,
                isActive: true,
                status: { nextMaintenanceDate: { lte: new Date() } }
            }
        })
    ]);

    // Equipment by status
    const byStatus = await prisma.equipmentStatus.groupBy({
        by: ["status"],
        where: {
          equipment: { ...roleFilter, isActive: true },
        },
        _count: true,
    });
    const equipmentByStatus = byStatus.map(s => ({ status: s.status, count: s._count }));

    const data = {
      // Calculated real-time averages
      avgUtilizationRate: 0, // Need usage analytics for this, kept simplified
      avgEfficiency: avgEfficiency,
      avgHealthScore: avgHealthScore,
      
      // Totals
      totalUsageHours: usageAggregates._sum.totalUsageHours || 0,
      totalDowntime: usageAggregates._sum.totalDowntime || 0,
      totalEnergyConsumed: usageAggregates._sum.energyConsumed || 0,

      // Dashboard Counts
      totalInstitutions,
      totalEquipment,
      activeEquipment,
      unresolvedAlerts,
      maintenanceDue,
      equipmentByStatus
    };
    
    res.json({ success: true, overview: data, equipmentByStatus });
  });

  // Get Equipment Analytics
  getEquipmentAnalytics = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const { id } = req.params; 
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const roleFilter = filterDataByRole(req);
    const equipment = await prisma.equipment.findFirst({
      where: { id, ...roleFilter },
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or access denied.",
      });
    }

    const data = await prisma.usageAnalytics.findMany({
      where: {
        equipmentId: id,
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    });

    res.json({ success: true, data });
  });

  // Get Department Analytics
  getDepartmentAnalytics = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const roleFilter = filterDataByRole(req);
    const equipment = await prisma.equipment.findFirst({
      where: { id, ...roleFilter },
      include: { analyticsParams: true },
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or access denied.",
      });
    }

    // Dynamic Calculation here as well
    const params = equipment.analyticsParams || {};
    const { healthScore, efficiency } = calculateMetrics(
        params.temperature, 
        params.vibration, 
        params.energyConsumption
    );

    const data = {
        ...params,
        efficiency: efficiency // Override
    };

    res.json({
      success: true,
      data: data,
    });
  });

  // Predictive Analytics Integration
  getLabPredictiveAnalytics = asyncHandler(async (req, res) => {
    const { labId } = req.params;

    const equipmentList = await prisma.equipment.findMany({
      where: { 
        lab: { labId: labId },
        isActive: true 
      },
      include: {
        status: true,
        analyticsParams: true,
        maintenanceRecords: {
          orderBy: { maintenanceDate: 'desc' },
          take: 1
        }
      }
    });

    if (!equipmentList.length) {
      return res.json({ success: true, data: [] });
    }

    const predictions = await Promise.all(equipmentList.map(async (eq) => {
      const status = eq.status || {};
      const params = eq.analyticsParams || {};
      
      const lastMaintenance = eq.maintenanceRecords[0]?.maintenanceDate || eq.status?.lastMaintenanceDate;
      
      let daysSinceMaintenance = 0;
      if (lastMaintenance) {
        const diffTime = Math.abs(new Date() - new Date(lastMaintenance));
        daysSinceMaintenance = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      const features = {
        temperature: params.temperature || status.temperature || 50,
        vibration: params.vibration || status.vibration || 0,
        energyConsumption: params.energyConsumption || status.energyConsumption || 200,
        daysSinceMaintenance: daysSinceMaintenance
      };

      const mlResult = await mlService.getPrediction(features);

      let daysUntilMaintenance = null;
      if (mlResult.prediction === 1 || mlResult.probability > 70) {
        const urgencyFactor = mlResult.probability / 100;
        daysUntilMaintenance = Math.max(1, Math.floor(7 * (1 - urgencyFactor)));
      } else {
        const maintenanceCycle = 90;
        daysUntilMaintenance = Math.max(0, maintenanceCycle - daysSinceMaintenance);
      }

      return {
        id: eq.id,
        name: eq.name,
        features,
        prediction: {
          ...mlResult,
          daysUntilMaintenance,
          lastMaintenanceDate: lastMaintenance,
          daysSinceMaintenance
        }
      };
    }));

    res.json({ success: true, data: predictions });
  });
}

export default new AnalyticsController();