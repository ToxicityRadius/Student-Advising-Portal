import React from 'react';
import FacultyLayout from '../faculty/FacultyLayout';

const AdviserLayout = ({ activePage, pageTitle, children }) => (
  <FacultyLayout activePage={activePage} pageTitle={pageTitle}>
    {children}
  </FacultyLayout>
);

export default AdviserLayout;
