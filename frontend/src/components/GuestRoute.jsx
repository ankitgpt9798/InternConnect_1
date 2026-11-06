import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

// Login and registration are only for guests. A logged-in user (including right after logging in)
// goes to the page they originally asked for, or to the dashboard.
export default function GuestRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="py-16 text-center text-slate-500">Loading…</p>;
  if (user) return <Navigate to={location.state?.from || '/dashboard'} replace />;
  return <Outlet />;
}
