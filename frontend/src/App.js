import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { getHomePathForRole } from './utils/roleRedirect';
import './index.css';

// Public / auth pages
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ActivateAccount = lazy(() => import('./pages/ActivateAccount'));
const VerifyCode = lazy(() => import('./pages/VerifyCode'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const ChangeEmail = lazy(() => import('./pages/ChangeEmail'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const Purpose = lazy(() => import('./pages/Purpose'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Student pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const Profile = lazy(() => import('./pages/Profile'));
const ViewGrades = lazy(() => import('./pages/ViewGrades'));
const Checklist = lazy(() => import('./pages/Checklist'));
const PlanOfStudy = lazy(() => import('./pages/PlanOfStudy'));
const AvailableSubjects = lazy(() => import('./pages/AvailableSubjects'));
const MyRecord = lazy(() => import('./pages/student/MyRecord'));
const Settings = lazy(() => import('./pages/Settings'));
const Help = lazy(() => import('./pages/Help'));

// Shared pages
const Notifications = lazy(() => import('./pages/Notifications'));

// Admin pages
const CurriculumManagement = lazy(() => import('./pages/admin/CurriculumManagement'));
const CurriculumDetail = lazy(() => import('./pages/admin/CurriculumDetail'));
const ForecastDashboard = lazy(() => import('./pages/admin/ForecastDashboard'));
const TermManagement = lazy(() => import('./pages/admin/TermManagement'));
const TransferOwnership = lazy(() => import('./pages/admin/TransferOwnership'));
const AuditLogViewer = lazy(() => import('./pages/admin/AuditLogViewer'));

// Adviser pages
const StudentList = lazy(() => import('./pages/adviser/StudentList'));
const StudentDetail = lazy(() => import('./pages/adviser/StudentDetail'));
const GradeEntry = lazy(() => import('./pages/adviser/GradeEntry'));
const StudyPlanView = lazy(() => import('./pages/adviser/StudyPlanView'));
const RegenerationReview = lazy(() => import('./pages/adviser/RegenerationReview'));
const ValidationFlow = lazy(() => import('./pages/adviser/ValidationFlow'));

const PageFallback = () => (
  <div
    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
  >
    <div style={{ color: '#888', fontSize: '0.9rem' }}>Loading…</div>
  </div>
);

function AppContent() {
  const location = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const homeElement = loading ? (
    <Landing />
  ) : isAuthenticated ? (
    <Navigate to={getHomePathForRole(user?.role)} replace />
  ) : (
    <Landing />
  );

  const hideNavbar =
    location.pathname === '/verify-code' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/change-password' ||
    location.pathname === '/change-email' ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/activate') ||
    location.pathname === '/dashboard' ||
    location.pathname === '/profile' ||
    location.pathname === '/grades' ||
    location.pathname === '/checklist' ||
    location.pathname === '/plan-of-study' ||
    location.pathname === '/subjects' ||
    location.pathname === '/settings' ||
    location.pathname === '/help' ||
    location.pathname === '/notifications' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/adviser');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main id="main-content">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={homeElement} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/purpose" element={<Purpose />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-code" element={<VerifyCode />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/activate/:token" element={<ActivateAccount />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/change-email" element={<ChangeEmail />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/complete-profile"
              element={
                <PrivateRoute>
                  <CompleteProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/grades"
              element={
                <PrivateRoute>
                  <ViewGrades />
                </PrivateRoute>
              }
            />
            <Route
              path="/checklist"
              element={
                <PrivateRoute>
                  <Checklist />
                </PrivateRoute>
              }
            />
            <Route
              path="/plan-of-study"
              element={
                <PrivateRoute>
                  <PlanOfStudy />
                </PrivateRoute>
              }
            />
            <Route
              path="/subjects"
              element={
                <PrivateRoute>
                  <AvailableSubjects />
                </PrivateRoute>
              }
            />
            <Route
              path="/my-record"
              element={
                <PrivateRoute roles={['student']}>
                  <MyRecord />
                </PrivateRoute>
              }
            />
            {/* Notifications */}
            <Route
              path="/notifications"
              element={
                <PrivateRoute>
                  <Notifications />
                </PrivateRoute>
              }
            />
            {/* Settings / Help */}
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
            <Route
              path="/help"
              element={
                <PrivateRoute>
                  <Help />
                </PrivateRoute>
              }
            />
            {/* Admin routes */}
            <Route
              path="/admin/curriculum"
              element={
                <PrivateRoute roles={['admin']}>
                  <CurriculumManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/curriculum/:id"
              element={
                <PrivateRoute roles={['admin']}>
                  <CurriculumDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/forecast"
              element={
                <PrivateRoute roles={['admin']}>
                  <ForecastDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/terms"
              element={
                <PrivateRoute roles={['admin']}>
                  <TermManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/transfer-ownership"
              element={
                <PrivateRoute roles={['admin']}>
                  <TransferOwnership />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <PrivateRoute roles={['admin']}>
                  <AuditLogViewer />
                </PrivateRoute>
              }
            />
            {/* Adviser routes */}
            <Route
              path="/adviser/students"
              element={
                <PrivateRoute roles={['adviser', 'admin']}>
                  <StudentList />
                </PrivateRoute>
              }
            />
            <Route
              path="/adviser/students/:sarId"
              element={
                <PrivateRoute roles={['adviser', 'admin']}>
                  <StudentDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/adviser/students/:sarId/grades"
              element={
                <PrivateRoute roles={['adviser', 'admin']}>
                  <GradeEntry />
                </PrivateRoute>
              }
            />
            <Route
              path="/adviser/students/:sarId/plan/:versionId"
              element={
                <PrivateRoute roles={['adviser', 'admin']}>
                  <StudyPlanView />
                </PrivateRoute>
              }
            />
            <Route
              path="/adviser/students/:sarId/plan/:versionId/review"
              element={
                <PrivateRoute roles={['adviser', 'admin']}>
                  <RegenerationReview />
                </PrivateRoute>
              }
            />
            <Route
              path="/adviser/students/:sarId/plan/:versionId/validate"
              element={
                <PrivateRoute roles={['adviser', 'admin']}>
                  <ValidationFlow />
                </PrivateRoute>
              }
            />
            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}

function App() {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    console.error('REACT_APP_GOOGLE_CLIENT_ID is not set.');
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ErrorBoundary>
        <AuthProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </Router>
        </AuthProvider>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  );
}

export default App;
