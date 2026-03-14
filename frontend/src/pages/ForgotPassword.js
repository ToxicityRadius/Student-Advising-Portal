import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Button, Alert } from 'react-bootstrap';
import api from '../utils/api';
import AuthBackgroundShell from '../components/auth/AuthBackgroundShell';
import { AuthCenteredCard, AuthInput } from '../components/auth/AuthFormPrimitives';
import backgroundImage from '../assets/images/bg.png';
import studentAdvisingLogo from '../assets/images/STUDENT ADVISING LOGO 1.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackgroundShell backgroundImage={backgroundImage}>
      <AuthCenteredCard
        logo={studentAdvisingLogo}
        heading="Forgot Password?"
        headingClassName="mb-2"
        subtext="Enter your email address and we'll send you a link to reset your password."
        colProps={{ xs: 12, sm: 10, md: 8, lg: 6, xl: 5, style: { maxWidth: '380px' } }}
        cardBodyClassName="p-4 p-md-5"
      >
        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {message && <Alert variant="success" dismissible onClose={() => setMessage('')}>{message}</Alert>}

        <Form onSubmit={handleSubmit}>
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email Address"
            size="lg"
          />

          <Button
            type="submit"
            variant="warning"
            size="lg"
            className="w-100 fw-bold mb-3 login-button"
            disabled={loading}
            style={{
              backgroundColor: '#FFC107',
              borderColor: '#FFC107',
              color: '#000'
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <div className="text-center" style={{ fontSize: '0.85rem' }}>
            <Link to="/login" className="text-decoration-none">
              ← Back to Login
            </Link>
          </div>
        </Form>
      </AuthCenteredCard>
    </AuthBackgroundShell>
  );
};

export default ForgotPassword;
