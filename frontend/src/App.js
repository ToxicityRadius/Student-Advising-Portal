import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ActivateAccount from './pages/ActivateAccount';
import VerifyCode from './pages/VerifyCode';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CompleteProfile from './pages/CompleteProfile';
import Profile from './pages/Profile';
import AboutUs from './pages/AboutUs';
import Purpose from './pages/Purpose';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || 
                     location.pathname === '/register' || 
                     location.pathname === '/verify-code' || 
                     location.pathname === '/forgot-password' || 
                     location.pathname.startsWith('/reset-password') ||
                     location.pathname.startsWith('/activate');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/purpose" element={<Purpose />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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

      </Routes>
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
          <AppContent />
        </Router>
      </AuthProvider>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  );
}

export default App;
