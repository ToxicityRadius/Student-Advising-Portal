import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudyPlanChecklist from '../StudyPlanChecklist';

const course = (overrides = {}) => ({
  id: overrides.id || Math.random(),
  yearLevel: overrides.yearLevel || 1,
  semester: overrides.semester || 1,
  grade: overrides.grade || '',
  status: overrides.status || 'pending',
  Course: {
    code: overrides.code || 'CPE 101',
    name: overrides.name || 'Computer Engineering as a Discipline',
    units: overrides.units || 1,
  },
  ...overrides,
});

describe('StudyPlanChecklist', () => {
  test('groups courses by year and semester without rendering a slot column', () => {
    render(
      <StudyPlanChecklist
        courses={[
          course({ id: 1, code: 'CPE 101', yearLevel: 1, semester: 1 }),
          course({ id: 2, code: 'CPE 105', yearLevel: 1, semester: 2 }),
        ]}
      />,
    );

    expect(screen.queryByText(/^Slot$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Semester Slot/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Year 1.*1st Semester.*1 course/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Year 1.*2nd Semester.*1 course/i })).toBeTruthy();
    expect(screen.getByText('CPE 101')).toBeInTheDocument();
    expect(screen.getByText('CPE 105')).toBeInTheDocument();
  });

  test('shows irregular advisory when the plan extends beyond year 4 second semester', () => {
    render(
      <StudyPlanChecklist
        courses={[course({ id: 1, code: 'CPE 499', yearLevel: 5, semester: 1 })]}
      />,
    );

    expect(screen.getByText(/Irregular Study Plan Advisory/i)).toBeInTheDocument();
    expect(screen.getByText(/review curriculum conversion/i)).toBeInTheDocument();
    expect(screen.getByText(/Program Chair\/Registrar/i)).toBeInTheDocument();
  });

  test('keeps editable year and semester controls inside course rows', async () => {
    const user = userEvent.setup();
    const onTermChange = jest.fn();

    render(
      <StudyPlanChecklist
        courses={[course({ id: 10, code: 'CPE 200', yearLevel: 2, semester: 1 })]}
        editable
        availableYearLevels={[1, 2, 3, 4, 5]}
        onTermChange={onTermChange}
      />,
    );

    const row = screen.getByText('CPE 200').closest('tr');
    const selects = within(row).getAllByRole('combobox');

    await user.selectOptions(selects[0], '3');
    await user.selectOptions(selects[1], '2');

    expect(onTermChange).toHaveBeenCalledWith(10, 'yearLevel', '3');
    expect(onTermChange).toHaveBeenCalledWith(10, 'semester', '2');
  });
});
