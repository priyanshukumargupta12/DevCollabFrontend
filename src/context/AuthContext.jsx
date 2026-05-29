import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ─── Context ───────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Initial State ─────────────────────────────────────────────────────────
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

// ─── Reducer ───────────────────────────────────────────────────────────────
const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'HYDRATION_FAILED':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
};

// ─── Helper: persist auth to localStorage ─────────────────────────────────
const persistAuth = (token, user) => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
};

// ─── Provider ──────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * Rehydrate session from localStorage on mount.
   */
  useEffect(() => {
    const rehydrate = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        dispatch({ type: 'HYDRATION_FAILED' });
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, token } });
      } catch {
        clearAuth();
        dispatch({ type: 'HYDRATION_FAILED' });
      }
    };
    rehydrate();
  }, []);

  // ── EXISTING: Email / Password login ──────────────────────────────────
  const login = useCallback(async (credentials) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      persistAuth(data.token, data.user);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, token: data.token } });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed.' };
    }
  }, []);

  // ── EXISTING: Email / Password register ───────────────────────────────
  const register = useCallback(async (userData) => {
    try {
      const { data } = await api.post('/auth/register', userData);
      persistAuth(data.token, data.user);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, token: data.token } });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed.' };
    }
  }, []);

  // ── NEW: Google OAuth ─────────────────────────────────────────────────
  /**
   * Verify Google credential token with backend.
   * @param {string} credential - Google ID token from @react-oauth/google
   */
  const googleLogin = useCallback(async (credential) => {
    try {
      const { data } = await api.post('/auth/google', { credential });
      persistAuth(data.token, data.user);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, token: data.token } });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Google sign-in failed.' };
    }
  }, []);

  // ── NEW: Email OTP ────────────────────────────────────────────────────
  /**
   * Request an OTP to be sent to the given email.
   * @param {string} email
   */
  const sendEmailOTP = useCallback(async (email) => {
    try {
      const { data } = await api.post('/auth/otp/email/send', { email });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to send OTP.' };
    }
  }, []);

  /**
   * Verify an email OTP and authenticate the user.
   * @param {string} email
   * @param {string} otp - 6-digit code
   */
  const verifyEmailOTP = useCallback(async (email, otp) => {
    try {
      const { data } = await api.post('/auth/otp/email/verify', { email, otp });
      persistAuth(data.token, data.user);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, token: data.token } });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'OTP verification failed.' };
    }
  }, []);

  // ── NEW: Phone OTP ───────────────────────────────────────────────────
  // Phone OTP has been removed. Only Google OAuth and Email OTP are supported.

  // ── EXISTING: Logout ──────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore server errors — still clear client state
    } finally {
      clearAuth();
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  // ── NEW: Forgot/Reset Password ──────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to request password reset.' };
    }
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { password });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to reset password.' };
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      ...state,
      // Existing actions
      login,
      register,
      logout,
      // Extended actions
      googleLogin,
      sendEmailOTP,
      verifyEmailOTP,
      forgotPassword,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Custom Hook ───────────────────────────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
