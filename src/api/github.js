import api from './axios';

/**
 * Fetch GitHub configuration (client ID)
 */
export const getGithubConfig = async () => {
  const response = await api.get('/github/config');
  return response.data;
};

/**
 * Link GitHub account with authorization code
 * @param {string} code - GitHub OAuth authorization code
 */
export const connectGithub = async (code) => {
  const response = await api.post('/github/connect', { code });
  return response.data;
};

/**
 * Disconnect linked GitHub account
 */
export const disconnectGithub = async () => {
  const response = await api.delete('/github/disconnect');
  return response.data;
};

/**
 * Fetch GitHub user details
 */
export const getGithubProfile = async () => {
  const response = await api.get('/github/profile');
  return response.data;
};

/**
 * Fetch linked user's GitHub repositories
 */
export const getGithubRepos = async () => {
  const response = await api.get('/github/repos');
  return response.data;
};

/**
 * Search user's GitHub repositories
 * @param {string} query
 */
export const searchGithubRepos = async (query) => {
  const response = await api.get(`/github/repos/search?q=${query}`);
  return response.data;
};

/**
 * Fetch contribution graph calendar metrics
 */
export const getGithubContributions = async () => {
  const response = await api.get('/github/contributions');
  return response.data;
};
