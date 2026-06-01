import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function PublicRoute() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    const redirectPath = user?.role === 'admin' ? '/admin' : '/learner';
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
