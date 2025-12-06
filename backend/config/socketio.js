// backend/config/socketio.js - VERIFIED COMPLETE VERSION
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { jwtConfig } from './jwt.js';
import { SOCKET_EVENTS } from '../utils/socketEvents.js';

let io;

/**
 * Initializes the Socket.IO server and authentication middleware.
 * @param {http.Server} server - The HTTP server instance.
 */
const initializeSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided.'));
    }

    try {
      const decoded = jwt.verify(token, jwtConfig.secret);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token.'));
    }
  });

  // Connection handler
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    logger.info(`✅ Client connected: ${socket.id} (User: ${socket.userId})`);
    logger.info(`📊 Total connected clients: ${io.sockets.sockets.size}`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-based room
    socket.join(`role:${socket.userRole}`);

    // Handle equipment subscription
    socket.on(SOCKET_EVENTS.SUBSCRIBE_EQUIPMENT, (equipmentId) => {
      socket.join(`equipment:${equipmentId}`);
      logger.debug(`User ${socket.userId} subscribed to equipment ${equipmentId}`);
    });

    // Handle equipment unsubscription
    socket.on(SOCKET_EVENTS.UNSUBSCRIBE_EQUIPMENT, (equipmentId) => {
      socket.leave(`equipment:${equipmentId}`);
      logger.debug(`User ${socket.userId} unsubscribed from equipment ${equipmentId}`);
    });

    // Disconnect handler
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      logger.info(`❌ Client disconnected: ${socket.id}`);
      logger.info(`📊 Remaining connected clients: ${io.sockets.sockets.size}`);
    });

    // Error handler
    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      logger.error('Socket error:', error);
    });
  });

  logger.info('✅ Socket.IO initialized');
};

// --- Emitter Functions ---

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

const broadcastAlert = (alert) => {
  if (!io) {
    logger.error('❌ Cannot broadcast alert: Socket.IO not initialized!');
    return;
  }

  logger.info('🚨 Broadcasting new alert:', {
    alertId: alert.id,
    equipmentId: alert.equipment?.id,
    severity: alert.severity,
    connectedClients: io.sockets.sockets.size
  });

  // Emit to ALL connected clients for real-time updates
  io.emit(SOCKET_EVENTS.ALERT_NEW, alert);
  
  logger.info(`✅ Alert broadcast complete to ${io.sockets.sockets.size} clients`);
};

// --- Specific Broadcasters ---

/**
 * Broadcasts an equipment status update - CRITICAL FOR REAL-TIME
 * @param {string} equipmentId - The equipment's internal ID.
 * @param {object} status - The new status object.
 */
const broadcastEquipmentStatus = (equipmentId, status) => {
  if (!io) {
    logger.error('❌ Cannot broadcast: Socket.IO not initialized!');
    return;
  }

  const connectedClients = io.sockets.sockets.size;
  
  logger.info('🔊 Broadcasting equipment status:', {
    equipmentId,
    temperature: status.temperature,
    vibration: status.vibration,
    energyConsumption: status.energyConsumption,
    connectedClients
  });

  // Emit to equipment-specific room
  io.to(`equipment:${equipmentId}`).emit(SOCKET_EVENTS.EQUIPMENT_STATUS, status);
  
  // 🚀 CRITICAL: Emit to ALL connected clients for real-time updates
  io.emit(SOCKET_EVENTS.EQUIPMENT_STATUS_UPDATE, { 
    equipmentId, 
    status,
    timestamp: new Date().toISOString()
  });
  
  logger.info(`✅ Broadcast complete to ${connectedClients} clients`);
};

const broadcastNotification = (userId, notification) => {
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, notification);
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