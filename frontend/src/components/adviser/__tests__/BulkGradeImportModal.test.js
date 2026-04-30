import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BulkGradeImportModal from '../BulkGradeImportModal';

describe('BulkGradeImportModal', () => {
  test('describes the supported TIP grade scale for CSV import', () => {
    render(<BulkGradeImportModal show onHide={jest.fn()} onImport={jest.fn()} />);

    expect(screen.getByText(/Grades can be/i)).toHaveTextContent(
      'Grades can be numeric 1.00-3.00, 4.00, 5.00, 6.00, 7.00, INC, or Pending.',
    );
  });
});
