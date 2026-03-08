import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, ListGroup, Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const Dashboard = () => {
  const { user, setUser } = useAuth();

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [yearLevel, setYearLevel] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingAlert, setOnboardingAlert] = useState('');

  useEffect(() => {
    // After studentId is set, check onboarding status
    if (user && user.role === 'student' && user.studentId && !user.is_onboarded) {
      setShowOnboarding(true);
    }
  }, [user]);

  const handleOnboardingSubmit = async () => {
    if (!yearLevel) return;
    setOnboardingLoading(true);
    setOnboardingAlert('');
    try {
      const res = await api.post('/users/onboard', { current_year_level: Number(yearLevel) });
      const updatedUser = res.data.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      if (Number(yearLevel) > 1) {
        setOnboardingAlert('Please navigate to Grade Entry to input your past grades, then generate your Study Plan.');
      } else {
        setShowOnboarding(false);
      }
    } catch (err) {
      setOnboardingAlert(err.response?.data?.message || 'Onboarding failed');
    } finally {
      setOnboardingLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">Dashboard</h1>
      
      <Card className="mb-4 border-start border-warning border-5 shadow-sm">
        <Card.Body className="p-4">
          <h2 className="mb-4" style={{ fontSize: '1.75rem' }}>
            Welcome, {user?.firstName} {user?.lastName}!
          </h2>
          
          <Row className="g-4">
            <Col md={6}>
              <div className="mb-2">
                <small className="text-muted fw-semibold">Email</small>
                <p className="mb-0 fw-medium">{user?.email}</p>
              </div>
            </Col>
            <Col md={3}>
              <div className="mb-2">
                <small className="text-muted fw-semibold">Role</small>
                <div>
                  <Badge 
                    bg={user?.role === 'admin' ? 'danger' : user?.role === 'adviser' ? 'warning' : 'primary'}
                    className="text-uppercase"
                  >
                    {user?.role}
                  </Badge>
                </div>
              </div>
            </Col>
            <Col md={3}>
              <div className="mb-2">
                <small className="text-muted fw-semibold">Account Status</small>
                <div>
                  <Badge bg={user?.isActive ? 'success' : 'danger'}>
                    {user?.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      <Card className="shadow-sm border-3" style={{ borderColor: '#FFC107' }}>
        <Card.Header className="bg-warning fw-bold text-dark" style={{ fontSize: '1.25rem' }}>
          Quick Links
        </Card.Header>
        <Card.Body className="p-0">
          <ListGroup variant="flush">
            {user?.role === 'admin' && (
              <>
                <ListGroup.Item 
                  as={Link} 
                  to="/admin/users"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold border-2"
                  action
                >
                  <span className="me-2">👥</span> Manage Users
                </ListGroup.Item>
                <ListGroup.Item 
                  as={Link}
                  to="/admin/forecasting"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                  action
                >
                  <span className="me-2">📊</span> Course Demand Forecasting
                </ListGroup.Item>
                <ListGroup.Item 
                  as={Link}
                  to="/admin/curriculums"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                  action
                >
                  <span className="me-2">🗺️</span> Curriculum Management
                </ListGroup.Item>
                <ListGroup.Item 
                  as={Link}
                  to="/admin/calendar"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                  action
                >
                  <span className="me-2">📅</span> Academic Calendar
                </ListGroup.Item>
                <ListGroup.Item 
                  as={Link}
                  to="/admin/import"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                  action
                >
                  <span className="me-2">📥</span> Bulk Import
                </ListGroup.Item>
                <ListGroup.Item 
                  as={Link}
                  to="/admin/course-offerings"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                  action
                >
                  <span className="me-2">📋</span> Course Offerings
                </ListGroup.Item>
                <ListGroup.Item 
                  as={Link}
                  to="/adviser/dashboard"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                  action
                >
                  <span className="me-2">👨‍🏫</span> Adviser Dashboard
                </ListGroup.Item>
              </>
            )}
            
            {user?.role === 'adviser' && (
              <>
                <ListGroup.Item 
                  as={Link}
                  to="/adviser/dashboard"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                  action
                >
                  <span className="me-2">👨‍🎓</span> My Advisees
                </ListGroup.Item>
                <ListGroup.Item 
                  as={Link}
                  to="/study-plan"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                  action
                >
                  <span className="me-2">✅</span> Study Plans
                </ListGroup.Item>
              </>
            )}
            
            {user?.role === 'student' && (
              <>
                <ListGroup.Item 
                  as={Link}
                  to="/grades/entry"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                  action
                >
                  <span className="me-2">📝</span> Encode Grades
                </ListGroup.Item>
                <ListGroup.Item 
                  as={Link}
                  to="/grades/current"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                  action
                >
                  <span className="me-2">✔️</span> Current Semester
                </ListGroup.Item>
                <ListGroup.Item 
                  as={Link}
                  to="/study-plan"
                  className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                  action
                >
                  <span className="me-2">📚</span> My Study Plan
                </ListGroup.Item>
              </>
            )}
            
            <ListGroup.Item 
              as={Link}
              to="/profile"
              className="py-3 px-4 text-decoration-none text-dark fw-semibold"
              action
            >
              <span className="me-2">👤</span> My Profile
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      {/* ── Onboarding Modal ── */}
      <Modal show={showOnboarding} backdrop="static" keyboard={false} centered>
        <Modal.Header>
          <Modal.Title>Welcome! Complete Your Onboarding</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {onboardingAlert && (
            <Alert variant={user?.is_onboarded ? 'info' : 'danger'}>
              {onboardingAlert}
            </Alert>
          )}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">What is your current Year Level?</Form.Label>
            <Form.Select
              value={yearLevel}
              onChange={e => setYearLevel(e.target.value)}
              disabled={user?.is_onboarded}
            >
              <option value="">Select year level...</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          {user?.is_onboarded && onboardingAlert ? (
            <Button variant="warning" onClick={() => setShowOnboarding(false)}>
              Got it
            </Button>
          ) : (
            <Button
              variant="warning"
              disabled={!yearLevel || onboardingLoading}
              onClick={handleOnboardingSubmit}
            >
              {onboardingLoading ? <Spinner size="sm" animation="border" /> : 'Submit'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Dashboard;
