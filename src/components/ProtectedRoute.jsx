import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

/**
 * ProtectedRoute
 * Wraps routes that require authentication.
 * - Shows a full-page spinner while the session is being rehydrated.
 * - Redirects to /login if not authenticated.
 * - Renders children if authenticated.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Session is being rehydrated from localStorage — show loader
  if (isLoading) {
    return (
      <div className="page-loader">
        <Spinner size="lg" />
        <span>Verifying session…</span>
      </div>
    );
  }

  // Not logged in — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated — render the protected page
  return children;
};

export default ProtectedRoute;
