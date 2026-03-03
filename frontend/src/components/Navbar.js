import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar as BootstrapNavbar, Nav, Container, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/" className="fw-bold">
          <span style={{ color: '#FFC107' }}>Student Advising</span>
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {user ? (
              <>
                <Nav.Item className="text-light me-3 d-none d-lg-block">
                  Welcome, <strong>{user.firstName}</strong>!
                </Nav.Item>
                {isAdmin && (
                  <>
                    <Nav.Link as={Link} to="/admin/users" className="text-light">
                      Manage Users
                    </Nav.Link>
                    <Nav.Link as={Link} to="/admin/curriculums" className="text-light">
                      Curriculums
                    </Nav.Link>
                    <Nav.Link as={Link} to="/admin/import" className="text-light">
                      Bulk Import
                    </Nav.Link>
                    <Nav.Link as={Link} to="/adviser/dashboard" className="text-light">
                      Adviser Dashboard
                    </Nav.Link>
                  </>
                )}
                {user.role === 'student' && (
                  <>
                    <Nav.Link as={Link} to="/grades/entry" className="text-light">
                      Grade Entry
                    </Nav.Link>
                    <Nav.Link as={Link} to="/grades/current" className="text-light">
                      Current Semester
                    </Nav.Link>
                  </>
                )}
                {user.role === 'adviser' && (
                  <Nav.Link as={Link} to="/adviser/dashboard" className="text-light">
                    Adviser Dashboard
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
