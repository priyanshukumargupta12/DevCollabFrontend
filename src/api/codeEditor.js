import api from './axios';

/**
 * Code Editor API Service
 * Handles all REST operations for collaborative code files and version management.
 */

// ─── Code File CRUD ─────────────────────────────────────────────────────────

/**
 * Create a new code file or folder in a workspace
 * @param {string} workspaceId
 * @param {Object} data - { name, isFolder, parent, language, content }
 */
export const createCodeFile = async (workspaceId, data) => {
  const response = await api.post(`/workspaces/${workspaceId}/code-files`, data);
  return response.data;
};

/**
 * Get all code files and folders for a workspace (tree structure)
 * @param {string} workspaceId
 */
export const getCodeFiles = async (workspaceId) => {
  const response = await api.get(`/workspaces/${workspaceId}/code-files`);
  return response.data;
};

/**
 * Get a single code file with full content
 * @param {string} workspaceId
 * @param {string} fileId
 */
export const getCodeFileById = async (workspaceId, fileId) => {
  const response = await api.get(`/workspaces/${workspaceId}/code-files/${fileId}`);
  return response.data;
};

/**
 * Update a code file (content, name, language, parent)
 * @param {string} workspaceId
 * @param {string} fileId
 * @param {Object} data - { content, name, language, parent, draft }
 */
export const updateCodeFile = async (workspaceId, fileId, data) => {
  const response = await api.put(`/workspaces/${workspaceId}/code-files/${fileId}`, data);
  return response.data;
};

/**
 * Delete a code file or folder (soft delete)
 * @param {string} workspaceId
 * @param {string} fileId
 */
export const deleteCodeFile = async (workspaceId, fileId) => {
  const response = await api.delete(`/workspaces/${workspaceId}/code-files/${fileId}`);
  return response.data;
};

/**
 * Execute code file content on the server
 * @param {string} workspaceId
 * @param {string} fileId
 * @param {Object} data - { code, language } (optional — uses saved content if omitted)
 */
export const executeCodeFile = async (workspaceId, fileId, data = {}) => {
  const response = await api.post(`/workspaces/${workspaceId}/code-files/${fileId}/execute`, data);
  return response.data;
};

// ─── Version History ─────────────────────────────────────────────────────────

/**
 * Save a new version snapshot of the file
 * @param {string} workspaceId
 * @param {string} fileId
 * @param {Object} data - { label }
 */
export const saveVersion = async (workspaceId, fileId, data = {}) => {
  const response = await api.post(`/workspaces/${workspaceId}/code-files/${fileId}/versions`, data);
  return response.data;
};

/**
 * Get version history list for a file
 * @param {string} workspaceId
 * @param {string} fileId
 * @param {number} limit
 */
export const getVersionHistory = async (workspaceId, fileId, limit = 30) => {
  const response = await api.get(`/workspaces/${workspaceId}/code-files/${fileId}/versions?limit=${limit}`);
  return response.data;
};

/**
 * Get a specific version with full content (for diff viewing)
 * @param {string} workspaceId
 * @param {string} fileId
 * @param {string} versionId
 */
export const getVersionById = async (workspaceId, fileId, versionId) => {
  const response = await api.get(`/workspaces/${workspaceId}/code-files/${fileId}/versions/${versionId}`);
  return response.data;
};

/**
 * Restore file content from a specific version
 * @param {string} workspaceId
 * @param {string} fileId
 * @param {string} versionId
 */
export const restoreVersion = async (workspaceId, fileId, versionId) => {
  const response = await api.post(
    `/workspaces/${workspaceId}/code-files/${fileId}/versions/${versionId}/restore`
  );
  return response.data;
};
