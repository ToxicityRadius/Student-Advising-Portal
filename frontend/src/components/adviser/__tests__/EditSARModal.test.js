import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditSARModal from '../EditSARModal';

const sar = {
  id: 42,
  studentName: 'Sample Student',
  studentNumber: '1234567',
  yearLevel: 1,
  isLinkedToAccount: true,
  Curriculum: { id: 8, name: 'BS CPE Curriculum 2018' },
  Student: {
    first_name: 'Sample',
    middle_name: '',
    last_name: 'Student',
    suffix: '',
    program: 'BSCpE',
    student_type: 'regular',
  },
};

describe('EditSARModal', () => {
  test('uses database programs as the Program dropdown options', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue();

    render(
      <EditSARModal
        show
        onHide={jest.fn()}
        onSubmit={onSubmit}
        sar={sar}
        curriculums={[sar.Curriculum]}
        canChangeProgram
        programs={[
          { id: 1, code: 'BSCpE', name: 'Computer Engineering' },
          { id: 2, code: 'BSIT', name: 'Information Technology' },
        ]}
      />,
    );

    expect(screen.queryByLabelText('Student Name')).not.toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'BSCpE - Computer Engineering' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'BSIT - Information Technology' }),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Program'), 'BSIT');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].studentName).toBe('Sample Student');
    expect(onSubmit.mock.calls[0][0].studentProfile.program).toBe('BSIT');
  });

  test('keeps Program read-only and does not submit it when the user is not Super Admin', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue();

    render(
      <EditSARModal
        show
        onHide={jest.fn()}
        onSubmit={onSubmit}
        sar={sar}
        curriculums={[sar.Curriculum]}
        canChangeProgram={false}
        programs={[{ id: 1, code: 'BSCpE', name: 'Computer Engineering' }]}
      />,
    );

    expect(screen.getByLabelText('Program')).toBeDisabled();
    expect(screen.queryByText(/Only Super Admin can change the program/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].studentProfile).not.toHaveProperty('program');
  });
});
