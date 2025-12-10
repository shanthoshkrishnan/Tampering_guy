// ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = currentUser.role
    ? String(currentUser.role).toUpperCase()
    : null;

  const isAdmin = userRole === 'ADMIN';
  const isManufacturer = userRole === 'MANUFACTURER';
  const isPreUser = !!currentUser.isPreUser; // must be set in AuthContext

  // Only new (not pre-user), non-admin, non-manufacturer, unverified users go to /verify-email
  if (!isAdmin && !isManufacturer && !isPreUser && !currentUser.emailVerified) {
    if (location.pathname !== '/verify-email') {
      return (
        <Navigate
          to="/verify-email"
          state={{ from: location }}
          replace
        />
      );
    }
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map((r) =>
      String(r).toUpperCase()
    );
    if (!normalizedAllowed.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
