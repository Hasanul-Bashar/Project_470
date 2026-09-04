/**
 * notificationService.js
 * Central service for creating in-app notifications.
 * Call createNotification() from any controller to log a notification.
 */

const Notification = require('../models/Notification');

/**
 * Create a single in-app notification record.
 * @param {Object} opts
 * @param {string} opts.recipientId
 * @param {string} opts.recipientEmail
 * @param {string} [opts.recipientRole]
 * @param {string} opts.type
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.link]
 * @param {string} [opts.sourceId]
 * @param {string} [opts.sourceType]
 */
async function createNotification({
  recipientId,
  recipientEmail,
  recipientRole = 'user',
  type,
  title,
  message,
  link = '',
  sourceId = '',
  sourceType = '',
}) {
  try {
    await Notification.create({
      recipientId,
      recipientEmail,
      recipientRole,
      type,
      title,
      message,
      link,
      sourceId,
      sourceType,
    });
  } catch (err) {
    console.error('❌ notificationService.createNotification error:', err.message);
  }
}

/**
 * Bulk create notifications for multiple recipients.
 */
async function createBulkNotifications(notificationsArray) {
  try {
    if (!notificationsArray?.length) return;
    await Notification.insertMany(notificationsArray);
  } catch (err) {
    console.error('❌ notificationService.createBulkNotifications error:', err.message);
  }
}

module.exports = { createNotification, createBulkNotifications };
