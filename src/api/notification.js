import api from './axios';

/**
 * Fetch all notifications for the authenticated user
 */
export const getNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data;
};

/**
 * Mark a single notification as read by ID
 * @param {string} notificationId
 */
export const markAsRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

/**
 * Mark all notifications as read for the current user
 */
export const markAllAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};
