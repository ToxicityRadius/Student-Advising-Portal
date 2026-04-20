import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isStudentOnboardingIncomplete } from '../utils/studentProfileCompletion';

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

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default PrivateRoute;
