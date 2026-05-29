import api from './axios';

/**
 * Fetch a user's profile details by username
 * @param {string} username
 */
export const getProfile = async (username) => {
  const response = await api.get(`/users/profile/${username}`);
  return response.data;
};

/**
 * Update the authenticated user's profile
 * @param {Object} data - profile details: nickname, title, bio, skills, experience, education, socials
 */
export const updateProfile = async (data) => {
  const response = await api.put('/users/profile', data);
  return response.data;
};

/**
 * Upload profile avatar image
 * @param {File} file - Selected image file
 */
export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await api.post('/users/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
