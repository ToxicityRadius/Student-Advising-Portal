import React from 'react';
import SidebarLayout from '../shared/SidebarLayout';

import goldBookImg from '../../assets/images/Gold book.png';
import goldChecklistImg from '../../assets/images/Gold Checklist.png';
import yellowCalendarImg from '../../assets/images/yellow calendar.png';
import goldUserImg from '../../assets/images/Gold User.png';
import goldSettingsImg from '../../assets/images/Gold Settings.png';
import goldBellImg from '../../assets/images/Gold Bell Gradient.png';

const icon = (src) => (
  <img src={src} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
);

const NAV_ITEMS = [
  { key: 'students', label: 'Students', to: '/adviser/students', icon: icon(goldUserImg) },
  { key: 'curriculum', label: 'Curriculum', to: '/admin/curriculum', icon: icon(goldBookImg) },
  { key: 'forecast', label: 'Forecast', to: '/admin/forecast', icon: icon(goldChecklistImg) },
  { key: 'terms', label: 'Terms', to: '/admin/terms', icon: icon(yellowCalendarImg) },
  {
    key: 'transfer',
    label: 'Transfer',
    to: '/admin/transfer-ownership',
    icon: icon(goldSettingsImg),
  },
  { key: 'audit', label: 'Audit Logs', to: '/admin/audit-logs', icon: icon(goldBellImg) },
];

const AdminLayout = ({ activePage, pageTitle, children }) => (
  <SidebarLayout
    activePage={activePage}
    pageTitle={pageTitle}
    navItems={NAV_ITEMS}
    roleLabel="Program Chair"
  >
    {children}
  </SidebarLayout>
);

export default AdminLayout;
