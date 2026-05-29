import api from './axios';

/**
 * Fetch all accessible notes in a workspace
 * @param {string} workspaceId
 */
export const getNotes = async (workspaceId) => {
  const response = await api.get(`/workspaces/${workspaceId}/notes`);
  return response.data;
};

/**
 * Create a new note in a workspace
 * @param {string} workspaceId
 * @param {Object} data - { title, content, isDraft, isShared }
 */
export const createNote = async (workspaceId, data) => {
  const response = await api.post(`/workspaces/${workspaceId}/notes`, data);
  return response.data;
};

/**
 * Update an existing note
 * @param {string} workspaceId
 * @param {string} noteId
 * @param {Object} data - { title, content, isDraft, isShared }
 */
export const updateNote = async (workspaceId, noteId, data) => {
  const response = await api.put(`/workspaces/${workspaceId}/notes/${noteId}`, data);
  return response.data;
};

/**
 * Delete a note
 * @param {string} workspaceId
 * @param {string} noteId
 */
export const deleteNote = async (workspaceId, noteId) => {
  const response = await api.delete(`/workspaces/${workspaceId}/notes/${noteId}`);
  return response.data;
};
