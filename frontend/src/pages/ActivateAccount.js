import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

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
    <div className="auth-container">
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
  );
};

export default ActivateAccount;
