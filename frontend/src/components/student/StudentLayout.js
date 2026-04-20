import React, { useEffect, useMemo, useState } from 'react';
import SidebarLayout from '../shared/SidebarLayout';
import { useAuth } from '../../context/AuthContext';
import { formatYearLevel } from '../../utils/formatters';
import api from '../../utils/api';

import goldHomePageImg from '../../assets/images/Gold HomePage.png';
import goldBookImg from '../../assets/images/Gold book.png';
import goldPlanImg from '../../assets/images/Gold Plan of Study.png';
import goldGradesImg from '../../assets/images/Gold Grades.png';
import goldUserImg from '../../assets/images/Gold User.png';
import goldSettingsImg from '../../assets/images/Gold Settings.png';
import goldHelpImg from '../../assets/images/Gold Help & Support.png';

import './StudentLayout.css';

const icon = (src) => (
  <img src={src} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
);

const StudentLayout = ({
  activePage,
  pageTitle,
  children,
  avatarOverride,
  availableSubjectsCount = 0,
}) => {
  const { user } = useAuth();
  const [currentTermLabel, setCurrentTermLabel] = useState('—');

  useEffect(() => {
    api
      .get('/terms/current')
      .then((response) => {
        const term = response.data?.data || response.data;
        const labels = { 1: '1st Semester', 2: '2nd Semester', 3: 'Summer' };
        if (term?.semester) {
          setCurrentTermLabel(labels[term.semester] || `Semester ${term.semester}`);
        }
      })
      .catch(() => {});
  }, []);

  const studentId = user?.student_id || user?.studentId || '';
  const yearLevel = user?.year_level || user?.yearLevel || '';
  const program = user?.program || '';
  const studentType = user?.student_type || user?.studentType || '';
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

  const navItems = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: icon(goldHomePageImg) },
      {
        key: 'subjects',
        label: 'Available Subjects',
        to: '/subjects',
        icon: icon(goldBookImg),
        badge: availableSubjectsCount > 0 ? availableSubjectsCount : undefined,
      },
      { key: 'plan-of-study', label: 'Study Plan', to: '/plan-of-study', icon: icon(goldPlanImg) },
      { key: 'grades', label: 'View Grades', to: '/grades', icon: icon(goldGradesImg) },
    ],
    [availableSubjectsCount],
  );

  const accountItems = useMemo(
    () => [
      { key: 'profile', label: 'Profile', to: '/profile', icon: icon(goldUserImg) },
      { key: 'settings', label: 'Settings', to: '/settings', icon: icon(goldSettingsImg) },
      { key: 'help', label: 'Help & Support', to: '/help', icon: icon(goldHelpImg) },
    ],
    [],
  );

  const rowTwoLeft = studentType || roleLabel || '';
  const rowTwoRight = program || '';

  const profileBadges = [
    `${yearLevel ? formatYearLevel(yearLevel) : '—'} · ${currentTermLabel}`,
    [rowTwoLeft, rowTwoRight].filter(Boolean).join(' · '),
  ].filter(Boolean);

  const classNames = {
    root: 'student-layout',
    sidebar: 'student-sidebar',
    mobileButton: 'student-mobile-menu-btn',
    mobileOverlay: 'student-mobile-overlay',
    main: 'student-main-shell',
    topbar: 'student-topbar',
    content: 'student-content',
  };

  const renderProfileDetails = () => (
    <>
      <div
        style={{
          fontSize: '0.82rem',
          color: '#888',
          fontWeight: 600,
          marginBottom: 14,
          textAlign: 'center',
        }}
      >
        {studentId || 'No Student Number'}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          width: '100%',
        }}
      >
        {profileBadges.map((badge) => (
          <span
            key={badge}
            style={{
              background: 'linear-gradient(135deg, #FFD54F 0%, #FFC107 100%)',
              color: '#4E342E',
              fontSize: '0.73rem',
              fontWeight: 700,
              textTransform: 'capitalize',
              padding: '6px 14px',
              borderRadius: 20,
              whiteSpace: 'nowrap',
              textAlign: 'center',
              flex: '1 1 0',
              boxShadow: '0 2px 6px rgba(255,193,7,0.30)',
              letterSpacing: '0.2px',
            }}
          >
            {badge}
          </span>
        ))}
      </div>
    </>
  );

  return (
    <SidebarLayout
      activePage={activePage}
      pageTitle={pageTitle}
      navItems={navItems}
      accountItems={accountItems}
      avatarOverride={avatarOverride}
      classNames={classNames}
      disableInnerWrapper
      renderProfileDetails={renderProfileDetails}
    >
      {children}
    </SidebarLayout>
  );
};

export default StudentLayout;
