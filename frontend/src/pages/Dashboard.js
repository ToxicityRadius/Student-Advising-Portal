import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, ListGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import StudentIdModal from '../components/StudentIdModal';

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const [showStudentIdModal, setShowStudentIdModal] = useState(false);

  useEffect(() => {
    // Check if user is a student without a studentId
    if (user && user.role === 'student' && !user.studentId) {
      setShowStudentIdModal(true);
    }
  }, [user]);

  const handleStudentIdSubmit = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/update-student-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ studentId })
      });

      const data = await response.json();

      if (response.ok) {
        // Update user in context and localStorage
        const updatedUser = { ...user, studentId };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setShowStudentIdModal(false);
      } else {
        throw new Error(data.message || 'Failed to update Student Number');
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <Container className="py-4">
      {showStudentIdModal && (
        <StudentIdModal 
          onSubmit={handleStudentIdSubmit}
          userEmail={user?.email}
        />
      )}
      
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
                  href="#" 
                  className="py-3 px-4 text-dark fw-semibold"
                  action
                >
                  <span className="me-2">📊</span> Course Demand Forecasting
                </ListGroup.Item>
                <ListGroup.Item 
                  href="#" 
                  className="py-3 px-4 text-dark fw-semibold"
                  action
                >
                  <span className="me-2">📋</span> Petition Management
                </ListGroup.Item>
                <ListGroup.Item 
                  href="#" 
                  className="py-3 px-4 text-dark fw-semibold"
                  action
                >
                  <span className="me-2">🗺️</span> Curriculum Mapping
                </ListGroup.Item>
              </>
            )}
            
            {user?.role === 'adviser' && (
              <>
                <ListGroup.Item 
                  href="#" 
                  className="py-3 px-4 text-dark fw-semibold"
                  action
                >
                  <span className="me-2">👨‍🎓</span> My Advisees
                </ListGroup.Item>
                <ListGroup.Item 
                  href="#" 
                  className="py-3 px-4 text-dark fw-semibold"
                  action
                >
                  <span className="me-2">✅</span> Validate Study Plans
                </ListGroup.Item>
                <ListGroup.Item 
                  href="#" 
                  className="py-3 px-4 text-dark fw-semibold"
                  action
                >
                  <span className="me-2">📄</span> Generate Advising Reports
                </ListGroup.Item>
              </>
            )}
            
            {user?.role === 'student' && (
              <>
                <ListGroup.Item 
                  href="#" 
                  className="py-3 px-4 text-dark fw-semibold"
                  action
                >
                  <span className="me-2">📝</span> Encode Grades
                </ListGroup.Item>
                <ListGroup.Item 
                  href="#" 
                  className="py-3 px-4 text-dark fw-semibold"
                  action
                >
                  <span className="me-2">✔️</span> View Checklist & Progress
                </ListGroup.Item>
                <ListGroup.Item 
                  href="#" 
                  className="py-3 px-4 text-dark fw-semibold"
                  action
                >
                  <span className="me-2">📚</span> Generate Study Plan
                </ListGroup.Item>
                <ListGroup.Item 
                  href="#" 
                  className="py-3 px-4 text-dark fw-semibold"
                  action
                >
                  <span className="me-2">🎯</span> Elective Guidance
                </ListGroup.Item>
              </>
            )}
            
            <ListGroup.Item 
              href="#" 
              className="py-3 px-4 text-dark fw-semibold"
              action
            >
              <span className="me-2">👤</span> My Profile
            </ListGroup.Item>
            <ListGroup.Item 
              href="#" 
              className="py-3 px-4 text-dark fw-semibold"
              action
            >
              <span className="me-2">⚙️</span> Settings
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Dashboard;
