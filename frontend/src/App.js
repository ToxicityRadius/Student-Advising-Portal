import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import ActivateAccount from './pages/ActivateAccount';
import VerifyCode from './pages/VerifyCode';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import FacultyRegister from './pages/FacultyRegister';
import CurriculumManager from './pages/Admin/CurriculumManager';
import BulkImport from './pages/Admin/BulkImport';
import GradeEntry from './pages/GradeEntry';
import CurrentSemester from './pages/CurrentSemester';
import AdviserDashboard from './pages/AdviserDashboard';
import AcademicCalendar from './pages/AcademicCalendar';
import StudyPlan from './pages/StudyPlan';
import DemandForecasting from './pages/Admin/DemandForecasting';
import './index.css';

function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || 
                     location.pathname === '/register' || 
                     location.pathname === '/verify-code' || 
                     location.pathname === '/forgot-password' || 
                     location.pathname.startsWith('/reset-password') ||
                     location.pathname.startsWith('/faculty-register');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/faculty-register/:token" element={<FacultyRegister />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/activate/:token" element={<ActivateAccount />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute adminOnly={true}>
              <ManageUsers />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/curriculums"
          element={
            <PrivateRoute adminOnly={true}>
              <CurriculumManager />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/import"
          element={
            <PrivateRoute adminOnly={true}>
              <BulkImport />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/calendar"
          element={
            <PrivateRoute adminOnly={true}>
              <AcademicCalendar />
            </PrivateRoute>
          }
        />
        <Route
          path="/grades/entry"
          element={
            <PrivateRoute roles={['student']}>
              <GradeEntry />
            </PrivateRoute>
          }
        />
        <Route
          path="/grades/current"
          element={
            <PrivateRoute roles={['student']}>
              <CurrentSemester />
            </PrivateRoute>
          }
        />
        <Route
          path="/study-plan"
          element={
            <PrivateRoute roles={['student']}>
              <StudyPlan />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/forecasting"
          element={
            <PrivateRoute adminOnly={true}>
              <DemandForecasting />
            </PrivateRoute>
          }
        />
        <Route
          path="/adviser/dashboard"
          element={
            <PrivateRoute roles={['adviser', 'admin']}>
              <AdviserDashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '131713767896-89rer50ssss6p9emd116afanmclchahv.apps.googleusercontent.com';
  
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppContent />
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
