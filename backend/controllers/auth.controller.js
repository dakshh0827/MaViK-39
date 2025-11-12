import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import { jwtConfig } from "../config/jwt.js";
import {
  USER_ROLE_ENUM,
  OTP_PURPOSE_ENUM,
  AUTH_PROVIDER_ENUM,
} from "../utils/constants.js";
import EmailService from "../utils/emailService.js";

/**
 * Wraps async functions to catch errors and pass to next middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Generates a 6-digit OTP.
 */
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

/**
 * Generates a JWT token for a user.
 */
const generateAccessToken = (user) => {
  // The user object should just be the payload
  const payload = {
    userId: user.id || user.userId, // Handle both user object and payload
    email: user.email,
    role: user.role,
    institute: user.institute,
    labId: user.labId,
  };
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
};

// --- NEW FUNCTION ---
/**
 * Generates a Refresh Token (long-lived).
 */
const generateRefreshToken = (user) => {
  // Refresh token only needs the user ID
  const payload = {
    userId: user.id || user.userId,
  };
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
};
class AuthController {
  /**
   * Step 1: Register new user (creates unverified user and sends OTP)
   */
  /**
   * Step 1: Register new user (creates unverified user and sends OTP)
   */
  register = asyncHandler(async (req, res, next) => {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      phone,
      institute,
      labId,
    } = req.body;

    // Check if user exists and is verified
    let existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser && existingUser.emailVerified) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    // Lab ID translation for Trainers
    let labInternalId = null;
    if (role === USER_ROLE_ENUM.TRAINER) {
      if (!labId) {
        return res.status(400).json({
          success: false,
          message: "labId is required for Trainers.",
        });
      }

      // Find lab by PUBLIC ID and get internal ObjectId
      // FIXED: Added trimming and case-insensitive search
      const lab = await prisma.lab.findFirst({
        where: {
          labId: {
            equals: labId.trim(),
            mode: "insensitive",
          },
        },
      });

      if (!lab) {
        // Log for debugging
        logger.error(`Lab not found with labId: "${labId}"`);

        // Get all labs to help with debugging
        const allLabs = await prisma.lab.findMany({
          select: { labId: true, name: true },
        });
        logger.debug("Available labs:", allLabs);

        return res.status(400).json({
          success: false,
          message: `Invalid Lab ID provided: "${labId}". Please check the Lab ID and try again.`,
        });
      }

      labInternalId = lab.id;
      logger.info(`Lab found: ${lab.name} (ID: ${lab.id})`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare base user data
    const baseUserData = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || USER_ROLE_ENUM.TRAINER,
      phone,
      institute:
        role === USER_ROLE_ENUM.LAB_TECHNICIAN ||
        role === USER_ROLE_ENUM.TRAINER
          ? institute
          : null,
      emailVerified: false,
      authProvider: AUTH_PROVIDER_ENUM.CREDENTIAL,
    };

    // Prepare create data with lab connection if needed
    const createData = {
      ...baseUserData,
      ...(labInternalId && {
        lab: {
          connect: { id: labInternalId },
        },
      }),
    };

    // Prepare update data with lab connection if needed
    // NOTE: Don't include 'id' in update data - it's immutable
    const updateData = {
      ...baseUserData,
      ...(labInternalId && {
        lab: {
          connect: { id: labInternalId },
        },
      }),
    };

    // Create or update unverified user
    const user = await prisma.user.upsert({
      where: { email },
      update: updateData,
      create: createData,
    });

    // Generate and send OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate old OTPs for registration
    await prisma.oTP.updateMany({
      where: { email, purpose: OTP_PURPOSE_ENUM.REGISTRATION, isUsed: false },
      data: { isUsed: true },
    });

    // Create new OTP
    await prisma.oTP.create({
      data: {
        email,
        otp,
        purpose: OTP_PURPOSE_ENUM.REGISTRATION,
        expiresAt,
      },
    });

    // Send OTP email (async, don't block response)
    EmailService.sendMail(email, otp).catch((err) =>
      logger.error("Failed to send OTP email:", err)
    );

    logger.info(`New user registration initiated: ${email}. OTP sent.`);
    res.status(201).json({
      success: true,
      message:
        "Registration successful. An OTP has been sent to your email for verification.",
      requiresVerification: true,
      data: {
        email: user.email,
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  });

  /**
   * Step 2: Verify email with OTP
   */
  verifyEmail = asyncHandler(async (req, res, next) => {
    const { email, otp, purpose = OTP_PURPOSE_ENUM.REGISTRATION } = req.body;

    // Find the latest valid OTP
    const validOtp = await prisma.oTP.findFirst({
      where: {
        email,
        otp,
        purpose,
        isUsed: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP.",
      });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: validOtp.id },
      data: { isUsed: true },
    });

    // Find and update user
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        institute: true,
        labId: true,
        lab: { select: { name: true } },
      },
    });

    // Send welcome email (async)
    EmailService.sendWelcomeEmail(email, user.firstName).catch((err) =>
      logger.error("Failed to send welcome email:", err)
    );

    // Generate JWT token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // Prevents client-side JS from accessing it
      secure: process.env.NODE_ENV === "production", // Only send over HTTPS
      sameSite: "strict", // Helps prevent CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (in milliseconds)
    });

    logger.info(`Email verified for user: ${email}`);
    res.json({
      success: true,
      message: "Email verified successfully. You are now logged in.",
      data: {
        accessToken, // Renamed from 'token'
        user,
      },
    });
  });

  /**
   * Resend OTP for email verification or login
   */
  resendOtp = asyncHandler(async (req, res, next) => {
    const { email, purpose = OTP_PURPOSE_ENUM.REGISTRATION } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check if email is already verified for registration purpose
    if (purpose === OTP_PURPOSE_ENUM.REGISTRATION && user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified.",
      });
    }

    // Generate new OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate old OTPs
    await prisma.oTP.updateMany({
      where: { email, purpose, isUsed: false },
      data: { isUsed: true },
    });

    // Create new OTP
    await prisma.oTP.create({
      data: { email, otp, purpose, expiresAt },
    });

    // Send OTP email
    EmailService.sendMail(email, otp).catch((err) =>
      logger.error("Failed to send OTP email:", err)
    );

    logger.info(`Resent OTP for: ${email}. Purpose: ${purpose}`);
    res.json({
      success: true,
      message: "A new OTP has been sent to your email.",
    });
  });

  /**
   * Step 1: Initiate login (send OTP for credential-based login if enabled)
   * Or direct login without OTP
   */
  login = asyncHandler(async (req, res, next) => {
    const { email, password, requireOtp = false } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check auth provider
    if (user.authProvider !== AUTH_PROVIDER_ENUM.CREDENTIAL) {
      return res.status(401).json({
        success: false,
        message: `This account is registered with ${user.authProvider}. Please log in using that method.`,
      });
    }

    // Check if user has password
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified. Please check your inbox for an OTP.",
        requiresVerification: true,
        data: { emailVerified: false },
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact administrator.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // If OTP is required for login, send OTP
    if (requireOtp) {
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.oTP.updateMany({
        where: { email, purpose: OTP_PURPOSE_ENUM.LOGIN, isUsed: false },
        data: { isUsed: true },
      });

      await prisma.oTP.create({
        data: { email, otp, purpose: OTP_PURPOSE_ENUM.LOGIN, expiresAt },
      });

      EmailService.sendOtpEmail(email, otp).catch((err) =>
        logger.error("Failed to send OTP email:", err)
      );

      logger.info(`Login OTP sent to: ${email}`);
      return res.json({
        success: true,
        message: "OTP sent to your email. Please verify to complete login.",
        requiresOTP: true,
      });
    }

    // Direct login without OTP
    const userPayload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      institute: user.institute,
      labId: user.labId,
    };

    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info(`User logged in: ${email}`);
    // Send access token in JSON response
    res.json({
      success: true,
      message: "Login successful.",
      data: {
        accessToken, // Renamed from 'token'
        user: userPayload,
      },
    });
  });

  /**
   * Step 2: Complete login with OTP (if OTP-based login is used)
   */
  completeLogin = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    // Find the latest valid OTP
    const validOtp = await prisma.oTP.findFirst({
      where: {
        email,
        otp,
        purpose: OTP_PURPOSE_ENUM.LOGIN,
        isUsed: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP.",
      });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: validOtp.id },
      data: { isUsed: true },
    });

    // Get user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        institute: true,
        labId: true,
      },
    });

    // Generate JWT token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Send refresh token in secure, HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info(`User logged in via OTP: ${email}`);
    // Send access token in JSON response
    res.json({
      success: true,
      message: "Login successful.",
      data: {
        accessToken, // Renamed from 'token'
        user,
      },
    });
    // --- END MODIFIED SECTION ---
  });

  /**
   * OAuth callback handler (for both Google and GitHub)
   */
  oauthCallback = asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=authentication_failed`
      );
    }

    // Generate JWT token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Send refresh token in cookie
    // Note: This is a redirect, so we set the cookie first
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info(
      `User logged in via OAuth (${user.authProvider}): ${user.email}`
    );

    // Redirect to frontend with access token in URL query
    // The frontend will need to read this from the URL and save it
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`
    );
    // --- END MODIFIED SECTION ---
  });

  /**
   * Google OAuth - Redirects to Google's consent screen
   */
  googleAuth = (req, res) => {
    logger.debug("Redirecting to Google for authentication...");
  };

  /**
   * GitHub OAuth - Redirects to GitHub's consent screen
   */
  githubAuth = (req, res) => {
    logger.debug("Redirecting to GitHub for authentication...");
  };

  /**
   * Get current user profile
   */
  getProfile = asyncHandler(async (req, res, next) => {
    // --- THIS IS THE FIX ---
    // The auth.js middleware sets req.user to the user object from Prisma,
    // which has an 'id' field, not 'userId'.
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }, // Change req.user.userId to req.user.id
      // --- END FIX ---
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        institute: true,
        labId: true,
        isActive: true,
        emailVerified: true,
        authProvider: true,
        createdAt: true,
        lab: { select: { name: true } },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  });
  /**
   * Update profile
   */
  updateProfile = asyncHandler(async (req, res, next) => {
    const { firstName, lastName, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        institute: true,
        labId: true,
      },
    });

    logger.info(`Profile updated: ${req.user.email}`);
    res.json({
      success: true,
      message: "Profile updated successfully.",
      data: user,
    });
  });

  /**
   * Change password
   */
  changePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check if user has password (not OAuth-only)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Cannot change password for OAuth accounts.",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashedPassword },
    });

    logger.info(`Password changed: ${req.user.email}`);
    res.json({
      success: true,
      message: "Password changed successfully.",
    });
  });

  refreshToken = asyncHandler(async (req, res, next) => {
    // 1. Get refresh token from cookie
    const token = req.cookies.refreshToken;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No refresh token provided." });
    }

    let payload;
    try {
      // 2. Verify the refresh token
      payload = jwt.verify(token, jwtConfig.refreshSecret);
    } catch (err) {
      logger.warn("Invalid refresh token received:", err.message);
      // This catches expired tokens or invalid signatures
      return res
        .status(403)
        .json({ success: false, message: "Invalid or expired refresh token." });
    }

    // 3. Token is valid, get user data to create new access token
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        institute: true,
        labId: true,
        isActive: true, // IMPORTANT: Check if user is still active
      },
    });

    // 4. Check if user exists and is active
    if (!user || !user.isActive) {
      return res
        .status(403)
        .json({ success: false, message: "User not found or deactivated." });
    }

    // 5. Issue new access token
    const userPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      institute: user.institute,
      labId: user.labId,
    };
    const accessToken = generateAccessToken(userPayload);

    res.json({
      success: true,
      message: "Access token refreshed.",
      data: {
        accessToken,
      },
    });
  });

  // --- NEW METHOD ---
  /**
   * Logs the user out by clearing the refresh token cookie
   */
  logout = asyncHandler(async (req, res, next) => {
    // We can't invalidate the stateless token,
    // but we can clear the cookie on the client's browser.
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res
      .status(200)
      .json({ success: true, message: "Logged out successfully." });
  });
}

export default new AuthController();
