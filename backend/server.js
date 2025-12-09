// backend/server.js

// =================== IMPORTS ===================
import dotenv from 'dotenv';
import http from 'http';
import app from './app.js'; 
import { initializeSocketIO } from './config/socketio.js';
import prisma from './config/database.js';
import logger from './utils/logger.js';
import firebaseService from './services/firebase.service.js';

// --- JOBS ---
import { scheduleBreakdownCheck } from './jobs/breakdown.scheduler.js';
import { scheduleAutoLock } from './jobs/autoLock.scheduler.js'; // <--- IMPORT THIS

// =================== CONFIG ===================
dotenv.config();
const PORT = process.env.PORT || 5000;

// =================== SERVER & SOCKET SETUP ===================
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocketIO(server);

// =================== START SERVER ===================
server.listen(PORT, async () => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    logger.info(`🚀 Server running on port ${PORT}`);
    
    // Start Services
    await firebaseService.startAllListeners();
    logger.info('✅ Firebase listeners started');

    // Start Schedulers
    scheduleBreakdownCheck();
    scheduleAutoLock(); // <--- START THE SCHEDULER
    logger.info('✅ Background schedulers started');

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
});

// =================== GRACEFUL SHUTDOWN ===================
const shutdown = async (signal) => {
  logger.info(`${signal} received: closing HTTP server`);
  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database disconnected');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;