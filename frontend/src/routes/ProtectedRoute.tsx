import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import type { UserRole } from '../types/user';
import { LoadingState } from '../components/Feedback/LoadingState';

type ProtectedRouteProps = {
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="page-center">
        <LoadingState
  title="Carregando CryoMap..."
  description="Validando sessão e permissões de acesso."
/>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{
          blockedPath: location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
}
