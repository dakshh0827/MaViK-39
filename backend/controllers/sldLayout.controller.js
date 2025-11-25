/*
 * =====================================================
 * backend/controllers/sldLayoutController.js (DIAGNOSTIC)
 * =====================================================
 * This version will help diagnose the Prisma model issue
 */
import prisma from "../config/database.js";
import { AppError } from "../utils/appError.js";
import { filterLabsByRole } from "../middlewares/rbac.js";

// Log available Prisma models on startup
console.log("========================================");
console.log("Available Prisma Models:");
console.log("========================================");
Object.keys(prisma).forEach(key => {
  if (!key.startsWith('_') && !key.startsWith('$') && typeof prisma[key] === 'object') {
    console.log(`  - prisma.${key}`);
  }
});
console.log("========================================");

// Try to find the correct model name
let SLDLayoutModel = null;
const possibleNames = ['sLDLayout', 'sldLayout', 'SLDLayout', 'SldLayout'];

for (const name of possibleNames) {
  if (prisma[name]) {
    SLDLayoutModel = prisma[name];
    console.log(`✓ Found SLD Layout model as: prisma.${name}`);
    break;
  }
}

if (!SLDLayoutModel) {
  console.error("✗ SLD Layout model not found! Please run: npx prisma generate");
}

/**
 * @desc    Get SLD layout for a lab
 * @route   GET /api/sld-layouts/:labId
 * @access  Private (Authenticated users with viewSLD permission)
 */
export const getSLDLayout = async (req, res, next) => {
  try {
    const { labId } = req.params;

    if (!SLDLayoutModel) {
      console.error("SLDLayoutModel is not initialized. Available models:");
      console.error(Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
      return next(new AppError("Database configuration error. SLD Layout model not found.", 500));
    }

    // 1. Verify user has permission AND access to this specific lab
    const labAccessFilter = filterLabsByRole(req);
    
    const lab = await prisma.lab.findFirst({
      where: { 
        labId: labId,
        ...labAccessFilter,
      },
      select: { labId: true }
    });

    if (!lab) {
      return next(new AppError("Lab not found or access denied", 404));
    }

    // 2. Get layout configuration
    let layout = await SLDLayoutModel.findUnique({
      where: { labId },
    });

    // 3. If no layout exists, return default configuration
    if (!layout) {
      layout = {
        labId,
        numColumns: 4,
        positions: {},
      };
    }

    res.status(200).json({
      success: true,
      data: layout,
    });
  } catch (error) {
    console.error("Error in getSLDLayout:", error);
    next(error);
  }
};

/**
 * @desc    Update SLD layout for a lab (Lab Manager only)
 * @route   PUT /api/sld-layouts/:labId
 * @access  Private (Lab Manager with manageSLD permission)
 */
export const updateSLDLayout = async (req, res, next) => {
  try {
    const { labId } = req.params;
    const { numColumns, positions } = req.body;

    if (!SLDLayoutModel) {
      console.error("SLDLayoutModel is not initialized. Available models:");
      console.error(Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
      return next(new AppError("Database configuration error. SLD Layout model not found.", 500));
    }

    // 1. Validation
    if (!numColumns || numColumns < 1 || numColumns > 8) {
      return next(new AppError("Number of columns must be between 1 and 8", 400));
    }

    if (!positions || typeof positions !== "object") {
      return next(new AppError("Positions must be a valid object", 400));
    }

    // 2. Verify user has permission AND access to this specific lab
    const labAccessFilter = filterLabsByRole(req);

    const lab = await prisma.lab.findFirst({
      where: { 
        labId: labId,
        ...labAccessFilter,
      },
      select: { labId: true }
    });

    if (!lab) {
      return next(new AppError("Lab not found or you don't have access to manage this lab's layout", 403));
    }
    
    // 3. Validate positions format
    for (const [equipmentId, pos] of Object.entries(positions)) {
      if (
        typeof pos.column !== "number" ||
        typeof pos.row !== "number" ||
        pos.column < 0 ||
        pos.column >= numColumns ||
        pos.row < 0
      ) {
        return next(
          new AppError(
            `Invalid position for equipment ${equipmentId}. Column must be 0-${numColumns - 1}, row must be >= 0`,
            400
          )
        );
      }
    }

    // 4. Update or create layout
    const layout = await SLDLayoutModel.upsert({
      where: { labId },
      update: {
        numColumns,
        positions,
        updatedBy: req.user.id,
      },
      create: {
        labId,
        numColumns,
        positions,
        updatedBy: req.user.id,
      },
    });

    res.status(200).json({
      success: true,
      message: "SLD layout updated successfully",
      data: layout,
    });
  } catch (error) {
    console.error("Error in updateSLDLayout:", error);
    next(error);
  }
};