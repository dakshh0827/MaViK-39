// =====================================================
// backend/middlewares/auth.js (FIXED - PLEASE RE-APPLY)
// =====================================================

import jwt from "jsonwebtoken";
import prisma from "../config/database.js";

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      // --- THIS IS THE FIX ---
      // You MUST select labId here so it's available in req.user
      // for the rbac.js (filterDataByRole) middleware.
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        institute: true,
        isActive: true,
        labId: true, // <-- THIS LINE IS CRUCIAL
      },
      // --- END FIX ---
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated.",
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication error.",
      error: error.message,
    });
  }
};

export default authMiddleware;
