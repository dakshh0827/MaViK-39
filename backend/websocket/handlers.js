import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

let io;

const initializeSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'https://mavik-39.vercel.app',
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id} (User: ${socket.userId})`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-based room
    socket.join(`role:${socket.userRole}`);

    // Handle equipment subscription
    socket.on('subscribe:equipment', (equipmentId) => {
      socket.join(`equipment:${equipmentId}`);
      logger.debug(`User ${socket.userId} subscribed to equipment ${equipmentId}`);
    });

    // Handle equipment unsubscription
    socket.on('unsubscribe:equipment', (equipmentId) => {
      socket.leave(`equipment:${equipmentId}`);
      logger.debug(`User ${socket.userId} unsubscribed from equipment ${equipmentId}`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  logger.info('✅ Socket.IO initialized');
};

// Emit events to connected clients
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

const emitToRole = (role, event, data) => {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
};

const emitToEquipment = (equipmentId, event, data) => {
  if (io) {
    io.to(`equipment:${equipmentId}`).emit(event, data);
  }
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

// Equipment status update event
const broadcastEquipmentStatus = (equipmentId, status) => {
  emitToEquipment(equipmentId, 'equipment:status', status);
  emitToAll('equipment:status:update', { equipmentId, status });
};

// Alert event
const broadcastAlert = (alert, targetUsers = []) => {
  if (targetUsers.length > 0) {
    targetUsers.forEach((userId) => {
      emitToUser(userId, 'alert:new', alert);
    });
  } else {
    emitToAll('alert:new', alert);
  }
};

// Notification event
const broadcastNotification = (userId, notification) => {
  emitToUser(userId, 'notification:new', notification);
};

export {
  initializeSocketIO,
  emitToUser,
  emitToRole,
  emitToEquipment,
  emitToAll,
  broadcastEquipmentStatus,
  broadcastAlert,
  broadcastNotification,
};
