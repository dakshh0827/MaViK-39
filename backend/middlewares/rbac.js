import { USER_ROLE_ENUM } from "../utils/constants.js";
import { AppError } from "../utils/appError.js"; // Import AppError for cleaner error handling

/**
 * Role-Based Access Control Middleware
 *
 * Roles:
 * - POLICY_MAKER: Full access, can manage labs
 * - LAB_MANAGER: Department/Institute-level access, cannot manage labs
 * - TRAINER: Lab-level access
 */

const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Check if user object exists (should be present after 'protect' middleware)
    if (!req.user || !req.user.role) {
      // Use AppError if possible, otherwise fall back to raw response
      if (AppError) {
          return next(new AppError("Authentication required for role check.", 401));
      }
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // 2. Check if the user's role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      if (AppError) {
          return next(
              new AppError(
                  `Access denied. Your role (${req.user.role}) does not meet the minimum requirement.`,
                  403
              )
          );
      }
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

// Predefined role checks
const isPolicyMaker = checkRole(USER_ROLE_ENUM.POLICY_MAKER);
const isLabManager = checkRole(USER_ROLE_ENUM.LAB_MANAGER);
const isLabManagerOrAbove = checkRole(
  USER_ROLE_ENUM.POLICY_MAKER,
  USER_ROLE_ENUM.LAB_MANAGER
);
const isAuthenticated = checkRole(
  USER_ROLE_ENUM.POLICY_MAKER,
  USER_ROLE_ENUM.LAB_MANAGER,
  USER_ROLE_ENUM.TRAINER
);

// --- Permission-based middleware structure ---
const can = {
  // Equipment permissions
  manageEquipment: isLabManagerOrAbove,
  viewEquipment: isAuthenticated,

  // Maintenance permissions
  manageMaintenance: isLabManagerOrAbove,
  viewMaintenance: isAuthenticated,

  // Analytics permissions
  viewDetailedAnalytics: isAuthenticated,
  viewBasicAnalytics: isAuthenticated,

  // Report permissions
  generateReports: isLabManagerOrAbove,
  viewReports: isAuthenticated,

  // Alert permissions
  manageAlerts: isLabManagerOrAbove,
  viewAlerts: isAuthenticated,

  // User management
  manageUsers: isPolicyMaker,

  // Lab management - ONLY POLICY_MAKER can manage labs
  manageLabs: isPolicyMaker,
  viewLabs: isLabManagerOrAbove,

  // Institute management - ONLY POLICY_MAKER
  manageInstitutes: isPolicyMaker,

  // System configuration
  manageSystem: isPolicyMaker,
  
  // SLD Layout Permissions (NEWLY ADDED)
  /** * @desc View SLD layout: Allowed for Policy Makers, Lab Managers, and Trainers.
   */
  viewSLD: isAuthenticated,

  /**
   * @desc Manage (Update) SLD layout: Allowed for Policy Makers and Lab Managers.
   */
  manageSLD: isLabManagerOrAbove,

  viewStudents: isAuthenticated,
  manageStudents: isLabManagerOrAbove,
};

// --- Data Filtering Utilities ---

/**
 * Creates a Prisma 'where' filter based on the user's role to restrict data access.
 * This is used for general data linked to a lab (e.g., Equipment, Maintenance).
 */
const filterDataByRole = (req) => {
  const { role, instituteId, department, labId } = req.user;

  switch (role) {
    case USER_ROLE_ENUM.POLICY_MAKER:
      return {}; // Can see everything
    
    case USER_ROLE_ENUM.LAB_MANAGER:
      if (!instituteId || !department) {
        return { id: null }; // Deny access if not configured
      }
      // Filter by the Lab's institute and department
      return {
        lab: {
          instituteId: instituteId,
          department: department,
        },
      };

    case USER_ROLE_ENUM.TRAINER:
      if (!labId) {
        return { id: null }; // Deny access if lab is not set
      }
      // Filter by the specific lab ID
      return {
        labId: labId,
      };

    default:
      return { id: null }; // Deny access
  }
};

/**
 * Filter for Lab queries based on user role (Lab Model filter).
 */
const filterLabsByRole = (req) => {
  const { role, instituteId, department, labId } = req.user;

  switch (role) {
    case USER_ROLE_ENUM.POLICY_MAKER:
      return {}; // Can see all labs

    case USER_ROLE_ENUM.LAB_MANAGER:
      if (!instituteId || !department) {
        return { id: null };
      }
      // Filter lab list by department and institute
      return {
        instituteId: instituteId,
        department: department,
      };

    case USER_ROLE_ENUM.TRAINER:
      // Trainers should only see their own lab (by primary key 'id' in Lab model)
      if (!labId) {
        return { id: null };
      }
      return {
        id: labId,
      };

    default:
      return { id: null };
  }
};

// --- Exports ---
export {
  checkRole,
  isPolicyMaker,
  isLabManager,
  isLabManagerOrAbove,
  isAuthenticated,
  can,
  filterDataByRole,
  filterLabsByRole,
};