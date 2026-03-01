import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import backgroundImage from '../assets/images/bg.png';

const ActivateAccount = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const activateAccount = async () => {
      try {
        const response = await api.get(`/auth/activate/${token}`);
        const { token: authToken, user } = response.data;
        
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        setStatus('success');
        setMessage('Account activated successfully! Redirecting to dashboard...');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Failed to activate account');
      }
    };

    activateAccount();
  }, [token, navigate]);

  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center position-relative" 
      style={{ 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      
      {/* Yellow rectangle - left side, top overlap */}
      <div 
        className="position-absolute" 
        style={{ 
          left: 0,
          top: '10.5%',
          width: '550px',
          height: '60px',
          backgroundColor: '#FFC107',
          zIndex: 2,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
        }}
      />
      
      {/* Yellow rectangle - right side, bottom overlap */}
      <div 
        className="position-absolute" 
        style={{ 
          right: 0,
          bottom: '10.5%',
          width: '1500px',
          height: '60px',
          backgroundColor: '#FFC107',
          zIndex: 1,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
        }}
      />
    <div className="auth-container" style={{ position: 'relative', zIndex: 3 }}>
      <div className="auth-card">
        <h2>Account Activation</h2>
        {status === 'loading' && (
          <div className="alert alert-info">Activating your account...</div>
        )}
        {status === 'success' && (
          <div className="alert alert-success">{message}</div>
        )}
        {status === 'error' && (
          <>
            <div className="alert alert-error">{message}</div>
            <div className="auth-links">
              <a href="/login">Go to Login</a>
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
};

export default ActivateAccount;
