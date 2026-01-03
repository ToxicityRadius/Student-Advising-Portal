import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import backgroundImage from '../sys-bg-img1.d66192ea.jpg';
import tipLogo from '../tip logo.png';

const VerifyCode = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [successCountdown, setSuccessCountdown] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  
  const userId = location.state?.userId;
  const userEmail = location.state?.email;

  useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
  }, [userId, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (successCountdown !== null && successCountdown > 0) {
      const timer = setTimeout(() => setSuccessCountdown(successCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (successCountdown === 0) {
      navigate('/dashboard');
    }
  }, [successCountdown, navigate]);

  const handleChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = pastedData.split('');
    while (newCode.length < 6) newCode.push('');
    setCode(newCode);

    // Focus last filled input
    const lastIndex = Math.min(pastedData.length - 1, 5);
    const lastInput = document.getElementById(`code-input-${lastIndex}`);
    if (lastInput) lastInput.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          code: verificationCode,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.success) {
        console.log('Success! Storing token and redirecting...');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setSuccessCountdown(3);
      } else {
        console.log('Verification failed:', data.message);
        setError(data.message || 'Invalid verification code');
        setCode(['', '', '', '', '', '']);
        document.getElementById('code-input-0')?.focus();
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred. Please try again.');
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-input-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setResendLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setCountdown(60); // 60 second cooldown
        setCode(['', '', '', '', '', '']);
        document.getElementById('code-input-0')?.focus();
      } else {
        setError(data.message || 'Failed to resend code');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      {error && (
        <div className="error-popup-overlay">
          <div className="error-popup">
            <div className="error-popup-content">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
            <button className="error-close-btn" onClick={() => setError('')}>×</button>
          </div>
        </div>
      )}
      {successCountdown !== null && (
        <div className="error-popup-overlay">
          <div className="error-popup" style={{ borderColor: '#4CAF50' }}>
            <div className="error-popup-content">
              <span className="error-icon" style={{ fontSize: '48px' }}>✓</span>
              <h3 style={{ color: '#4CAF50', marginBottom: '10px' }}>Login Successful!</h3>
              <p>Redirecting to Dashboard in {successCountdown}...</p>
            </div>
          </div>
        </div>
      )}
      <div className="login-card">
        <div className="login-logo">
          <img src={tipLogo} alt="TIP Logo" />
        </div>
        <h2 className="login-title">Verify Your Identity</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
          We've sent a 6-digit code to <br />
          <strong>{userEmail || 'your email'}</strong>
        </p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="code-input-container">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-input-${index}`}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="code-input"
                autoFocus={index === 0}
              />
            ))}
          </div>
          <button type="submit" className="btn btn-continue" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleResendCode}
                disabled={countdown > 0 || resendLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: countdown > 0 ? '#999' : '#4CAF50',
                  textDecoration: 'underline',
                  cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {resendLoading ? 'Sending...' : countdown > 0 ? `Resend (${countdown}s)` : 'Resend Code'}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyCode;
