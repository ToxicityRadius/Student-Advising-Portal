import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import AcademicInfoModal from '../AcademicInfoModal';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('AcademicInfoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    api.get.mockImplementation((url) => {
      if (url === '/programs/options') {
        return Promise.resolve({
          data: {
            data: [{ id: 1, code: 'BSCpE', name: 'Bachelor of Science in Computer Engineering' }],
          },
        });
      }

      return Promise.resolve({
        data: {
          items: [
            { id: 1, name: 'BS CPE Curriculum 2025' },
            { id: 2, name: 'BS CS Curriculum 2025' },
          ],
        },
      });
    });

    api.post.mockResolvedValue({
      data: {
        success: true,
        user: {
          id: 99,
          current_year_level: 2,
          sex: 'Male',
        },
      },
    });
  });

  test('submits onboarding payload including year level and sex', async () => {
    const onComplete = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<AcademicInfoModal onComplete={onComplete} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users/curriculum-options');
    });

    await waitFor(() => {
      expect(document.querySelector('select[name="curriculum_id"]')).toBeTruthy();
    });

    const yearLevelSelect = document.querySelector('select[name="year_level"]');
    const programSelect = document.querySelector('select[name="program"]');
    const curriculumSelect = document.querySelector('select[name="curriculum_id"]');
    const studentTypeSelect = document.querySelector('select[name="student_type"]');
    const sexSelect = document.querySelector('select[name="sex"]');

    expect(yearLevelSelect).toBeTruthy();
    expect(programSelect).toBeTruthy();
    expect(curriculumSelect).toBeTruthy();
    expect(studentTypeSelect).toBeTruthy();
    expect(sexSelect).toBeTruthy();

    await user.selectOptions(yearLevelSelect, '2');
    await user.selectOptions(programSelect, 'BSCpE');
    await user.selectOptions(curriculumSelect, '1');
    await user.selectOptions(studentTypeSelect, 'regular');
    await user.selectOptions(sexSelect, 'Male');

    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users/onboard', {
        current_year_level: 2,
        program: 'BSCpE',
        curriculum_id: 1,
        student_type: 'regular',
        sex: 'Male',
      });
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ current_year_level: 2, sex: 'Male' }),
      );
    });
  });
});
