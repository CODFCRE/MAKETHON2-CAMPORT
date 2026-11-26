import React from 'react';
import { useUserStore } from '../../store/useUserStore';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user } = useUserStore();
  const location = useLocation();

  if (!user) {
    console.warn('[AuthGuard] Access denied to:', location.pathname, '- Redirecting to home');
    toast.error("Please sign in to access this feature");
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  console.log('[AuthGuard] Access granted to:', location.pathname);
  return <>{children}</>;
};

export default AuthGuard;
