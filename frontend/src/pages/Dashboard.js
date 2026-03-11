import React from 'react';
import { Container, Card, Row, Col, Badge, ListGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

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
    </Container>
  );
};

export default Dashboard;
