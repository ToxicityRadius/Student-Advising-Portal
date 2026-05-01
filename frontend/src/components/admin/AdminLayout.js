import React from 'react';
import FacultyLayout from '../faculty/FacultyLayout';

const AdminLayout = ({ activePage, pageTitle, children }) => (
  <FacultyLayout activePage={activePage} pageTitle={pageTitle}>
    {children}
  </FacultyLayout>
);

export default AdminLayout;
