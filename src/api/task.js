import api from './axios';

/**
 * Create a new task in a workspace
 * @param {string} workspaceId
 * @param {Object} data - { title, description, status, priority, dueDate, labels, assignedUser }
 */
export const createTask = async (workspaceId, data) => {
  const response = await api.post(`/workspaces/${workspaceId}/tasks`, data);
  return response.data;
};

/**
 * Get all tasks for a workspace
 * @param {string} workspaceId
 */
export const getTasks = async (workspaceId) => {
  const response = await api.get(`/workspaces/${workspaceId}/tasks`);
  return response.data;
};

/**
 * Update task details
 * @param {string} workspaceId
 * @param {string} taskId
 * @param {Object} data - fields to update
 */
export const updateTask = async (workspaceId, taskId, data) => {
  const response = await api.put(`/workspaces/${workspaceId}/tasks/${taskId}`, data);
  return response.data;
};

/**
 * Update only task status (for drag & drop drop events)
 * @param {string} workspaceId
 * @param {string} taskId
 * @param {string} status - 'todo' | 'in_progress' | 'review' | 'completed'
 */
export const updateTaskStatus = async (workspaceId, taskId, status) => {
  const response = await api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/status`, { status });
  return response.data;
};

/**
 * Delete a task
 * @param {string} workspaceId
 * @param {string} taskId
 */
export const deleteTask = async (workspaceId, taskId) => {
  const response = await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
  return response.data;
};
