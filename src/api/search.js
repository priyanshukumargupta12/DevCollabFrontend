import api from './axios';

/**
 * Execute a global search query
 * @param {string} query - The search text
 * @param {string} type - Category filter: 'all', 'workspaces', 'tasks', 'messages', 'users'
 * @param {string} [workspaceId] - Optional sub-scope workspace ID
 * @param {number} [page=1]
 * @param {number} [limit=10]
 */
export const searchGlobal = async (query, type = 'all', workspaceId = '', page = 1, limit = 10) => {
  const params = { q: query, type, page, limit };
  if (workspaceId) {
    params.workspaceId = workspaceId;
  }
  const response = await api.get('/search', { params });
  return response.data;
};
