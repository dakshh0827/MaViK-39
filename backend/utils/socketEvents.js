/**
 * Socket.IO Event Constants
 * Centralizes all event names for consistency between server and client.
 */
// backend/utils/socketEvents.js
export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Equipment
  SUBSCRIBE_EQUIPMENT: 'equipment:subscribe',
  UNSUBSCRIBE_EQUIPMENT: 'equipment:unsubscribe',
  EQUIPMENT_STATUS: 'equipment:status',
  EQUIPMENT_STATUS_UPDATE: 'equipment:status:update',
  
  // Alerts
  ALERT_NEW: 'alert:new',
  ALERT_RESOLVED: 'alert:resolved',
  ALERT_UPDATE: 'alert:update',
  
  // Notifications
  NOTIFICATION_NEW: 'notification:new',
};