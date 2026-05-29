import api from './axios';

/**
 * Fetch all events (+ task deadlines) for a workspace calendar
 * @param {string} workspaceId
 */
export const getEvents = async (workspaceId) => {
  const response = await api.get(`/workspaces/${workspaceId}/events`);
  return response.data;
};

/**
 * Create a new calendar event
 * @param {string} workspaceId
 * @param {Object} data - { title, description, start, end, allDay, type, color, reminders }
 */
export const createEvent = async (workspaceId, data) => {
  const response = await api.post(`/workspaces/${workspaceId}/events`, data);
  return response.data;
};

/**
 * Update an existing event
 * @param {string} workspaceId
 * @param {string} eventId
 * @param {Object} data
 */
export const updateEvent = async (workspaceId, eventId, data) => {
  const response = await api.put(`/workspaces/${workspaceId}/events/${eventId}`, data);
  return response.data;
};

/**
 * Delete an event
 * @param {string} workspaceId
 * @param {string} eventId
 */
export const deleteEvent = async (workspaceId, eventId) => {
  const response = await api.delete(`/workspaces/${workspaceId}/events/${eventId}`);
  return response.data;
};
