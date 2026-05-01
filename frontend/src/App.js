import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { getHomePathForRole } from './utils/roleRedirect';
import { getGoogleClientId } from './utils/googleOAuthConfig';
import './index.css';

// Public / auth pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ActivateAccount = lazy(() => import('./pages/ActivateAccount'));
const VerifyCode = lazy(() => import('./pages/VerifyCode'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const ChangeEmail = lazy(() => import('./pages/ChangeEmail'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Student pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const ViewGrades = lazy(() => import('./pages/ViewGrades'));
const PlanOfStudy = lazy(() => import('./pages/PlanOfStudy'));
const AvailableSubjects = lazy(() => import('./pages/AvailableSubjects'));
const Settings = lazy(() => import('./pages/Settings'));
const Help = lazy(() => import('./pages/Help'));

// Shared pages
const Notifications = lazy(() => import('./pages/Notifications'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const CurriculumManagement = lazy(() => import('./pages/admin/CurriculumManagement'));
const CurriculumDetail = lazy(() => import('./pages/admin/CurriculumDetail'));
const ForecastDashboard = lazy(() => import('./pages/admin/ForecastDashboard'));
const TermManagement = lazy(() => import('./pages/admin/TermManagement'));
const TransferOwnership = lazy(() => import('./pages/admin/TransferOwnership'));
const PrerequisiteOverrides = lazy(() => import('./pages/admin/PrerequisiteOverrides'));
const ProgramManagement = lazy(() => import('./pages/admin/ProgramManagement'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));

// Adviser pages
const AdviserDashboard = lazy(() => import('./pages/adviser/AdviserDashboard'));
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
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    document.body.classList.toggle('compact-mode', Boolean(user?.compactMode));
  }, [user?.compactMode]);
  const homeElement = loading ? (
    <PageFallback />
  ) : isAuthenticated ? (
    <Navigate to={getHomePathForRole(user?.role)} replace />
  ) : (
    <Navigate to="/login" replace />
  );

  return (
    <>
      <main id="main-content">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={homeElement} />
            <Route path="/about" element={<Navigate to="/login" replace />} />
            <Route path="/purpose" element={<Navigate to="/login" replace />} />
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
              path="/admin/dashboard"
              element={
                <PrivateRoute roles={['superadmin', 'admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <PrivateRoute roles={['superadmin', 'admin']}>
                  <UserManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/curriculum"
              element={
                <PrivateRoute roles={['admin', 'adviser']}>
                  <CurriculumManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/curriculum/:id"
              element={
                <PrivateRoute roles={['admin', 'adviser']}>
                  <CurriculumDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/forecast"
              element={
                <PrivateRoute roles={['admin', 'adviser']}>
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
                <PrivateRoute roles={['superadmin']}>
                  <TransferOwnership />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/programs"
              element={
                <PrivateRoute roles={['superadmin']}>
                  <ProgramManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/prerequisite-overrides"
              element={
                <PrivateRoute roles={['admin']}>
                  <PrerequisiteOverrides />
                </PrivateRoute>
              }
            />
            {/* Adviser routes */}
            <Route
              path="/adviser/dashboard"
              element={
                <PrivateRoute roles={['adviser']}>
                  <AdviserDashboard />
                </PrivateRoute>
              }
            />
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
  const googleClientId = getGoogleClientId();
  const appTree = (
    <ErrorBoundary>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );

  if (!googleClientId) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(
        'REACT_APP_GOOGLE_CLIENT_ID is missing or invalid. Google Sign-In is disabled until it is configured.',
      );
    }
    return appTree;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>;
}

export default App;
