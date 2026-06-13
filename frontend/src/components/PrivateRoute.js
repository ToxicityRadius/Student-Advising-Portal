import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isStudentOnboardingIncomplete } from '../utils/studentProfileCompletion';
import { ROLE_SUPERADMIN } from '../utils/roles';

const PrivateRoute = ({ children, adminOnly = false, roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.mustChangeEmail) {
    return <Navigate to="/change-email" />;
  }

  if (isStudentOnboardingIncomplete(user)) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin' && user.role !== ROLE_SUPERADMIN) {
    return <Navigate to="/dashboard" />;
  }

  const superadminMatches = user.role === ROLE_SUPERADMIN && roles.includes('admin');
  if (roles.length > 0 && !roles.includes(user.role) && !superadminMatches) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default PrivateRoute;
