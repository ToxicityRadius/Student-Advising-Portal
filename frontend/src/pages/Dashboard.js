import React, { useEffect, useState } from 'react';
import { Container, Card, Row, Col, Badge, ListGroup, Spinner, Alert, Image } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { buildProfileImageUrl, getInitials } from '../utils/profileImage';

const semesterLabel = {
  1: '1st Semester',
  2: '2nd Semester',
  3: 'Summer'
};

const Dashboard = () => {
  const { user } = useAuth();
  const [currentTerm, setCurrentTerm] = useState(null);
  const [termLoading, setTermLoading] = useState(true);
  const [profileReminderDismissed, setProfileReminderDismissed] = useState(
    () => sessionStorage.getItem('profileReminderDismissed') === 'true'
  );

  const profileIncomplete =
    user?.role === 'student'
      ? !user?.program
      : !user?.contact_number;

  const showProfileReminder = profileIncomplete && !profileReminderDismissed;
  const displayName = `${user?.firstName || user?.first_name || ''} ${user?.lastName || user?.last_name || ''}`.trim();
  const profileImageUrl = buildProfileImageUrl(user?.profile_picture);

  const handleDismissProfileReminder = () => {
    sessionStorage.setItem('profileReminderDismissed', 'true');
    setProfileReminderDismissed(true);
  };

  useEffect(() => {
    const loadCurrentTerm = async () => {
      try {
        const response = await api.get('/terms/current');
        setCurrentTerm(response.data?.data || null);
      } catch (error) {
        setCurrentTerm(null);
      } finally {
        setTermLoading(false);
      }
    };

    loadCurrentTerm();
  }, []);

  return (
    <Container className="py-4">
      <h1 className="mb-4">Dashboard</h1>

      {showProfileReminder && (
        <Alert
          variant="info"
          dismissible
          onClose={handleDismissProfileReminder}
          className="mb-4"
        >
          <strong>Your profile is incomplete.</strong> Complete your profile to help your adviser and get the most out of the portal.{' '}
          <Alert.Link as={Link} to="/profile">Complete profile &rarr;</Alert.Link>
        </Alert>
      )}

      <Card className="mb-4 border-start border-primary border-5 shadow-sm">
        <Card.Body className="p-4">
          <h5 className="mb-2">Current Academic Term</h5>
          {termLoading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" />
              <span>Loading current term...</span>
            </div>
          ) : currentTerm ? (
            <div>
              <div className="fw-semibold fs-5">{currentTerm.schoolYear}</div>
              <div className="text-muted">{semesterLabel[currentTerm.semester] || `Semester ${currentTerm.semester}`}</div>
            </div>
          ) : (
            <p className="text-muted mb-0">No active term set yet.</p>
          )}
        </Card.Body>
      </Card>
      
      <Card className="mb-4 border-start border-warning border-5 shadow-sm">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            {profileImageUrl ? (
              <Image src={profileImageUrl} roundedCircle width={72} height={72} style={{ objectFit: 'cover' }} />
            ) : (
              <div
                className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                style={{ width: 72, height: 72, fontWeight: 700, fontSize: '1.1rem' }}
              >
                {getInitials(displayName)}
              </div>
            )}
            <h2 className="mb-0" style={{ fontSize: '1.75rem' }}>
              Welcome, {displayName || 'User'}!
            </h2>
          </div>
          
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
            <ListGroup.Item 
              as={Link}
              to="/profile"
              className="py-3 px-4 text-decoration-none text-dark fw-semibold"
              action
            >
              <span className="me-2">👤</span> My Profile
            </ListGroup.Item>
            {user?.role === 'admin' && (
              <ListGroup.Item
                as={Link}
                to="/admin/curriculum"
                className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                action
              >
                <span className="me-2">📘</span> Curriculum Management
              </ListGroup.Item>
            )}
            {user?.role === 'admin' && (
              <ListGroup.Item
                as={Link}
                to="/admin/terms"
                className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                action
              >
                <span className="me-2">📅</span> Term Management
              </ListGroup.Item>
            )}
            {user?.role === 'admin' && (
              <ListGroup.Item
                as={Link}
                to="/admin/forecast"
                className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                action
              >
                <span className="me-2">📈</span> Forecasting
              </ListGroup.Item>
            )}
            {user?.role === 'admin' && (
              <ListGroup.Item
                as={Link}
                to="/admin/transfer-ownership"
                className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                action
              >
                <span className="me-2">🔐</span> Transfer Ownership
              </ListGroup.Item>
            )}
            {(user?.role === 'admin' || user?.role === 'adviser') && (
              <ListGroup.Item
                as={Link}
                to="/adviser/students"
                className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                action
              >
                <span className="me-2">🗂️</span> Student Records
              </ListGroup.Item>
            )}
            {user?.role === 'student' && (
              <ListGroup.Item
                as={Link}
                to="/my-record"
                className="py-3 px-4 text-decoration-none text-dark fw-semibold"
                action
              >
                <span className="me-2">📄</span> My Academic Record
              </ListGroup.Item>
            )}
          </ListGroup>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Dashboard;
