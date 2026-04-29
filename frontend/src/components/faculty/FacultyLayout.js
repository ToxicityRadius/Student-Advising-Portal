import React from 'react';
import SidebarLayout from '../shared/SidebarLayout';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel, isSuperadmin } from '../../utils/roles';

import goldHomePageImg from '../../assets/images/Gold HomePage.png';
import goldUserImg from '../../assets/images/Gold User.png';
import goldBookImg from '../../assets/images/Gold book.png';
import goldChecklistImg from '../../assets/images/Gold Checklist.png';
import yellowCalendarImg from '../../assets/images/yellow calendar.png';
import goldSettingsImg from '../../assets/images/Gold Settings.png';

const icon = (src) => (
  <img src={src} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
);

const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: '/admin/dashboard',
    icon: icon(goldHomePageImg),
    roles: ['superadmin', 'admin'],
  },
  {
    key: 'adviser-dashboard',
    label: 'Dashboard',
    to: '/adviser/dashboard',
    icon: icon(goldHomePageImg),
    roles: ['adviser'],
  },
  {
    key: 'students',
    label: 'Students',
    to: '/adviser/students',
    icon: icon(goldUserImg),
    roles: ['superadmin', 'admin', 'adviser'],
  },
  {
    key: 'users',
    label: 'Users',
    to: '/admin/users',
    icon: icon(goldUserImg),
    roles: ['superadmin', 'admin'],
  },
  {
    key: 'curriculum',
    label: 'Curriculum',
    to: '/admin/curriculum',
    icon: icon(goldBookImg),
    roles: ['superadmin', 'admin', 'adviser'],
  },
  {
    key: 'forecast',
    label: 'Forecast',
    to: '/admin/forecast',
    icon: icon(goldChecklistImg),
    roles: ['superadmin', 'admin', 'adviser'],
  },
  {
    key: 'overrides',
    label: 'Overrides',
    to: '/admin/prerequisite-overrides',
    icon: icon(goldChecklistImg),
    roles: ['superadmin', 'admin'],
  },
  {
    key: 'terms',
    label: 'Terms',
    to: '/admin/terms',
    icon: icon(yellowCalendarImg),
    roles: ['superadmin', 'admin'],
  },
  {
    key: 'programs',
    label: 'Programs',
    to: '/admin/programs',
    icon: icon(goldSettingsImg),
    roles: ['superadmin'],
  },
  {
    key: 'transfer',
    label: 'Transfer',
    to: '/admin/transfer-ownership',
    icon: icon(goldSettingsImg),
    roles: ['superadmin', 'admin'],
  },
];

const FacultyLayout = ({ activePage, pageTitle, children }) => {
  const { user } = useAuth();
  const role = user?.role;
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const normalizedActivePage =
    activePage === 'dashboard' && role === 'adviser' ? 'adviser-dashboard' : activePage;

  return (
    <SidebarLayout
      activePage={normalizedActivePage}
      pageTitle={pageTitle}
      navItems={navItems}
      roleLabel={getRoleLabel(role) || (isSuperadmin(user) ? 'Super Admin' : 'Faculty')}
    >
      {children}
    </SidebarLayout>
  );
};

export default FacultyLayout;
