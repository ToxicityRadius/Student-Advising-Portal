import React, { useState, useEffect } from 'react';
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
    <div className="container">
      {showStudentIdModal && (
        <StudentIdModal 
          onSubmit={handleStudentIdSubmit}
          userEmail={user?.email}
        />
      )}
      <div className="dashboard">
        <h1>Dashboard</h1>
        <div className="user-table-container">
          <div style={{ marginBottom: '30px', borderLeft: '4px solid #FFC107', paddingLeft: '20px' }}>
            <h2 style={{ color: '#000000', marginBottom: '15px', fontSize: '28px' }}>Welcome, {user?.firstName} {user?.lastName}!</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
              <div>
                <p style={{ color: '#666', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>Email</p>
                <p style={{ color: '#000', fontWeight: '500' }}>{user?.email}</p>
              </div>
              <div>
                <p style={{ color: '#666', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>Role</p>
                <p><span className={`badge badge-${user?.role === 'admin' ? 'danger' : user?.role === 'adviser' ? 'warning' : 'primary'}`}>{user?.role?.toUpperCase()}</span></p>
              </div>
              <div>
                <p style={{ color: '#666', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>Account Status</p>
                <p><span className={`badge ${user?.isActive ? 'badge-success' : 'badge-danger'}`}>{user?.isActive ? 'ACTIVE' : 'INACTIVE'}</span></p>
              </div>
            </div>
          </div>
          
          <div style={{ 
            marginTop: '30px', 
            padding: '25px', 
            backgroundColor: '#FFC107', 
            borderRadius: '8px',
            border: '3px solid #000000'
          }}>
            <h3 style={{ color: '#000000', marginBottom: '20px', fontSize: '20px', fontWeight: '700' }}>Quick Links</h3>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              display: 'grid', 
              gap: '12px' 
            }}>
              {user?.role === 'admin' && (
                <>
                  <li>
                    <Link to="/admin/users" style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '700',
                      padding: '12px 15px',
                      display: 'block',
                      backgroundColor: '#ffffff',
                      borderRadius: '5px',
                      border: '2px solid #000000',
                      transition: 'all 0.3s'
                    }}>
                      👥 Manage Users
                    </Link>
                  </li>
                  <li>
                    <a href="#" style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 15px',
                      display: 'block',
                      backgroundColor: '#FFD54F',
                      borderRadius: '5px',
                      border: '2px solid #000000',
                      transition: 'all 0.3s'
                    }}>
                      📊 Course Demand Forecasting
                    </a>
                  </li>
                  <li>
                    <a href="#" style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 15px',
                      display: 'block',
                      backgroundColor: '#FFD54F',
                      borderRadius: '5px',
                      border: '2px solid #000000',
                      transition: 'all 0.3s'
                    }}>
                      📋 Petition Management
                    </a>
                  </li>
                  <li>
                    <a href="#" style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 15px',
                      display: 'block',
                      backgroundColor: '#FFD54F',
                      borderRadius: '5px',
                      border: '2px solid #000000',
                      transition: 'all 0.3s'
                    }}>
                      🗺️ Curriculum Mapping
                    </a>
                  </li>
                </>
              )}
              {user?.role === 'adviser' && (
                <>
                  <li>
                    <a href="#" style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 15px',
                      display: 'block',
                      backgroundColor: '#ffffff',
                      borderRadius: '5px',
                      border: '2px solid #000000',
                      transition: 'all 0.3s'
                    }}>
                      👨‍🎓 My Advisees
                    </a>
                  </li>
                  <li>
                    <a href="#" style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 15px',
                      display: 'block',
                      backgroundColor: '#FFD54F',
                      borderRadius: '5px',
                      border: '2px solid #000000',
                      transition: 'all 0.3s'
                    }}>
                      ✅ Validate Study Plans
                    </a>
                  </li>
                  <li>
                    <a href="#" style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 15px',
                      display: 'block',
                      backgroundColor: '#FFD54F',
                      borderRadius: '5px',
                      border: '2px solid #000000',
                      transition: 'all 0.3s'
                    }}>
                      📄 Generate Advising Reports
                    </a>
                  </li>
                </>
              )}
              {user?.role === 'student' && (
                <>
                  <li>
                    <a href="#" style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 15px',
                      display: 'block',
                      backgroundColor: '#ffffff',
                      borderRadius: '5px',
                      border: '2px solid #000000',
                      transition: 'all 0.3s'
                    }}>
                      📝 Encode Grades
                    </a>
                  </li>
                  <li>
                    <a href="#" style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 15px',
                      display: 'block',
                      backgroundColor: '#FFD54F',
                      borderRadius: '5px',
                      border: '2px solid #000000',
                      transition: 'all 0.3s'
                    }}>
                      ✔️ View Checklist & Progress
                    </a>
                  </li>
                  <li>
                    <a href="#" style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 15px',
                      display: 'block',
                      backgroundColor: '#FFD54F',
                      borderRadius: '5px',
                      border: '2px solid #000000',
                      transition: 'all 0.3s'
                    }}>
                      📚 Generate Study Plan
                    </a>
                  </li>
                  <li>
                    <a href="#" style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 15px',
                      display: 'block',
                      backgroundColor: '#FFD54F',
                      borderRadius: '5px',
                      border: '2px solid #000000',
                      transition: 'all 0.3s'
                    }}>
                      🎯 Elective Guidance
                    </a>
                  </li>
                </>
              )}
              <li>
                <a href="#" style={{
                  color: '#000000',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  padding: '12px 15px',
                  display: 'block',
                  backgroundColor: '#FFD54F',
                  borderRadius: '5px',
                  border: '2px solid #000000',
                  transition: 'all 0.3s'
                }}>
                  👤 My Profile
                </a>
              </li>
              <li>
                <a href="#" style={{
                  color: '#000000',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  padding: '12px 15px',
                  display: 'block',
                  backgroundColor: '#FFD54F',
                  borderRadius: '5px',
                  border: '2px solid #000000',
                  transition: 'all 0.3s'
                }}>
                  ⚙️ Settings
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
