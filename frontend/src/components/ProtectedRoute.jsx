import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="page"><p className="muted">Loading…</p></div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page">
        <div className="empty"><h2>This area is for {roles.join(' / ')} accounts</h2>
          <p>Your account is registered as {user.role}. Contact an administrator if you need access.</p></div>
      </div>
    );
  }
  return children;
}
