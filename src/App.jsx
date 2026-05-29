import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import OTPVerification from './pages/auth/OTPVerification';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CodeEditorPage from './pages/CodeEditorPage';

/**
 * App — root component.
 * Routes: /login, /register, /verify-otp, /dashboard (protected).
 */
function App() {
  return (
    <AuthProvider>
      <SocketProvider>

          {/* ─── Toast Notifications ──────────────────────────────── */}
          <Toaster
            position="top-right"
            gutter={12}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1a1b23',
                color: '#f1f5f9',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#1a1b23' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#1a1b23' } },
              loading: { iconTheme: { primary: '#8b5cf6', secondary: '#1a1b23' } },
            }}
          />

          {/* ─── Routes ───────────────────────────────────────────── */}
          <Routes>
            {/* Public auth routes */}
            <Route path="/login"      element={<Login />} />
            <Route path="/register"   element={<Register />} />
            <Route path="/verify-otp" element={<OTPVerification />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:username"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/workspace/:workspaceId/editor"
              element={
                <ProtectedRoute>
                  <CodeEditorPage />
                </ProtectedRoute>
              }
            />

            {/* Default + 404 redirect */}
            <Route path="/"  element={<Navigate to="/dashboard" replace />} />
            <Route path="*"  element={<Navigate to="/login"     replace />} />
          </Routes>

        </SocketProvider>
      </AuthProvider>
  );
}

export default App;
