import api from './axios';

/**
 * Upload a file to a workspace with progress tracking
 * @param {string} workspaceId 
 * @param {File} file 
 * @param {Function} onUploadProgress - callback (progressEvent) => {}
 */
export const uploadFile = async (workspaceId, file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(`/workspaces/${workspaceId}/files`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // Don't set timeout for file uploads to prevent premature cancellation
    timeout: 0,
    onUploadProgress,
  });
  return response.data;
};

/**
 * Get all files shared in a workspace
 * @param {string} workspaceId
 */
export const getFiles = async (workspaceId) => {
  const response = await api.get(`/workspaces/${workspaceId}/files`);
  return response.data;
};

/**
 * Delete a file in a workspace
 * @param {string} workspaceId
 * @param {string} fileId
 */
export const deleteFile = async (workspaceId, fileId) => {
  const response = await api.delete(`/workspaces/${workspaceId}/files/${fileId}`);
  return response.data;
};
