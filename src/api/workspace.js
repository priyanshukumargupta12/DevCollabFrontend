import api from './axios';

/**
 * Create a new workspace
 * @param {Object} data - { name, description }
 */
export const createWorkspace = async (data) => {
  const response = await api.post('/workspaces', data);
  return response.data;
};

/**
 * Get all workspaces for the authenticated user
 */
export const getWorkspaces = async () => {
  const response = await api.get('/workspaces');
  return response.data;
};

/**
 * Get a single workspace details by ID
 * @param {string} id
 */
export const getWorkspaceById = async (id) => {
  const response = await api.get(`/workspaces/${id}`);
  return response.data;
};

/**
 * Update workspace name/description
 * @param {string} id
 * @param {Object} data - { name, description }
 */
export const updateWorkspace = async (id, data) => {
  const response = await api.put(`/workspaces/${id}`, data);
  return response.data;
};

/**
 * Delete a workspace
 * @param {string} id
 */
export const deleteWorkspace = async (id) => {
  const response = await api.delete(`/workspaces/${id}`);
  return response.data;
};

/**
 * Add a member to a workspace by email
 * @param {string} id - Workspace ID
 * @param {string} email - Member email address
 * @param {string} role - 'admin' or 'member'
 */
export const addMember = async (id, email, role) => {
  const response = await api.post(`/workspaces/${id}/members`, { email, role });
  return response.data;
};

/**
 * Remove a member from workspace (or leave workspace)
 * @param {string} id - Workspace ID
 * @param {string} userId - Member User ID
 */
export const removeMember = async (id, userId) => {
  const response = await api.delete(`/workspaces/${id}/members/${userId}`);
  return response.data;
};

/**
 * Update a member's role (admin / member)
 * @param {string} id - Workspace ID
 * @param {string} userId - Member User ID
 * @param {string} role - 'admin' or 'member'
 */
export const updateMemberRole = async (id, userId, role) => {
  const response = await api.put(`/workspaces/${id}/members/${userId}`, { role });
  return response.data;
};

/**
 * Get paginated workspace activities timeline
 * @param {string} id - Workspace ID
 * @param {number} page
 * @param {number} limit
 */
export const getWorkspaceActivities = async (id, page = 1, limit = 15) => {
  const response = await api.get(`/workspaces/${id}/activities?page=${page}&limit=${limit}`);
  return response.data;
};

/**
 * Accept a pending workspace invitation.
 * @param {string} id - Workspace ID
 */
export const acceptInvitation = async (id) => {
  const response = await api.post(`/workspaces/${id}/invitations/accept`);
  return response.data;
};

/**
 * Decline a pending workspace invitation.
 * @param {string} id - Workspace ID
 */
export const rejectInvitation = async (id) => {
  const response = await api.post(`/workspaces/${id}/invitations/reject`);
  return response.data;
};
