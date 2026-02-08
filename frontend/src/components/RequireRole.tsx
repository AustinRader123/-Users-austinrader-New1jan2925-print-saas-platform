import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface RequireRoleProps {
  children: React.ReactNode;
  roles: string[]; // allowed roles
  redirectTo?: string; // default '/'
}

export default function RequireRole({ children, roles, redirectTo = '/' }: RequireRoleProps) {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
