import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar as BootstrapNavbar, Nav, Container, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const profileCompleted = !!user?.first_name;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
      <Container>
        <BootstrapNavbar.Brand as={profileCompleted ? Link : 'span'} to={profileCompleted ? '/' : undefined} className="fw-bold">
          <span style={{ color: '#FFC107' }}>Student Advising</span>
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {user ? (
              <>
                <Nav.Item className="text-light me-3 d-none d-lg-block">
                  Welcome, <strong>{user.first_name || user.firstName}</strong>!
                </Nav.Item>
                {profileCompleted && isAdmin && (
                  <>
                    <Nav.Link as={Link} to="/admin/users" className="text-light">
                      Manage Users
                    </Nav.Link>
                    <Nav.Link as={Link} to="/admin/curriculums" className="text-light">
                      Curriculums
                    </Nav.Link>
                    <Nav.Link as={Link} to="/admin/calendar" className="text-light">
                      Academic Calendar
                    </Nav.Link>
                    <Nav.Link as={Link} to="/admin/import" className="text-light">
                      Bulk Import
                    </Nav.Link>
                    <Nav.Link as={Link} to="/admin/forecasting" className="text-light">
                      Demand Forecasting
                    </Nav.Link>
                    <Nav.Link as={Link} to="/adviser/dashboard" className="text-light">
                      Adviser Dashboard
                    </Nav.Link>
                  </>
                )}
                {profileCompleted && user.role === 'student' && (
                  <>
                    <Nav.Link as={Link} to="/grades/entry" className="text-light">
                      Grade Entry
                    </Nav.Link>
                    <Nav.Link as={Link} to="/grades/current" className="text-light">
                      Current Semester
                    </Nav.Link>
                    <Nav.Link as={Link} to="/study-plan" className="text-light">
                      My Study Plan
                    </Nav.Link>
                  </>
                )}
                {profileCompleted && user.role === 'adviser' && (
                  <Nav.Link as={Link} to="/adviser/dashboard" className="text-light">
                    Adviser Dashboard
                  </Nav.Link>
                )}
                {profileCompleted && (
                  <Nav.Link as={Link} to="/profile" className="text-light">
                    My Profile
                  </Nav.Link>
                )}
                <Button 
                  variant="outline-warning" 
                  size="sm" 
                  onClick={handleLogout}
                  className="ms-2"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" className="text-light">
                  Login
                </Nav.Link>
                <Nav.Link as={Link} to="/register" className="text-light">
                  Register
                </Nav.Link>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
