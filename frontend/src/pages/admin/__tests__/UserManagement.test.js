import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import UserManagement from '../UserManagement';
import api from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../utils/useDebouncedValue', () => ({
  __esModule: true,
  default: (value) => value,
}));

jest.mock('../../../components/admin/AdminLayout', () => {
  return function MockAdminLayout({ children, activePage }) {
    return <div data-active-page={activePage}>{children}</div>;
  };
});

jest.mock('../../../components/PaginationControls', () => {
  return function MockPaginationControls() {
    return <div data-testid="pagination-controls" />;
  };
});

const programs = [
  { id: 8, code: 'BSCPE', name: 'Computer Engineering' },
  { id: 9, code: 'BSIT', name: 'Information Technology' },
];

const advisers = [{ id: 5, firstName: 'Grace', lastName: 'Adviser', email: 'grace@tip.edu.ph' }];

const users = [
  {
    id: 10,
    firstName: 'Ada',
    lastName: 'Student',
    email: 'ada@tip.edu.ph',
    role: 'student',
    isActive: true,
    Adviser: null,
    CurriculumRef: { Program: programs[0] },
  },
  {
    id: 11,
    firstName: 'Chair',
    lastName: 'Person',
    email: 'chair@tip.edu.ph',
    role: 'admin',
    isActive: true,
    AssignedPrograms: [programs[0]],
  },
];

describe('UserManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, role: 'superadmin' } });
    api.get.mockImplementation((url, config = {}) => {
      if (url === '/programs') return Promise.resolve({ data: { data: programs } });
      if (url === '/users' && config.params?.role === 'adviser') {
        return Promise.resolve({ data: { items: advisers, meta: { totalItems: 1 } } });
      }
      if (url === '/users') {
        return Promise.resolve({
          data: {
            items: users,
            meta: { page: 1, pageSize: 10, totalItems: users.length, totalPages: 1 },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    api.patch.mockResolvedValue({ data: { success: true } });
    api.put.mockResolvedValue({ data: { success: true } });
  });

  test('renders search and role/status/adviser/program filters with assigned adviser data', async () => {
    render(<UserManagement />);

    expect(await screen.findByText('Ada Student')).toBeInTheDocument();
    expect(screen.getByLabelText('Role filter')).toBeInTheDocument();
    expect(screen.getByLabelText('Status filter')).toBeInTheDocument();
    expect(screen.getByLabelText('Adviser filter')).toBeInTheDocument();
    expect(screen.getByLabelText('Program filter')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Super Admin' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Program Chair' })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: 'Grace Adviser' }).length).toBeGreaterThan(0);
  });

  test('sends selected filters to GET /users', async () => {
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText('Ada Student');

    await user.type(screen.getByPlaceholderText('Name, email, or role'), 'Ada');
    await user.selectOptions(screen.getByLabelText('Role filter'), 'student');
    await user.selectOptions(screen.getByLabelText('Status filter'), 'active');
    await user.selectOptions(screen.getByLabelText('Adviser filter'), '5');
    await user.selectOptions(screen.getByLabelText('Program filter'), '8');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          params: expect.objectContaining({
            search: 'Ada',
            role: 'student',
            status: 'active',
            adviserId: '5',
            programId: '8',
          }),
        }),
      );
    });
  });

  test('toggles status, assigns advisers, and lets Super Admin update staff program assignments', async () => {
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText('Ada Student');

    const adaRow = screen.getByText('Ada Student').closest('tr');
    await user.click(within(adaRow).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/10/toggle-status');
    });

    await user.selectOptions(within(adaRow).getByLabelText('Assign adviser for Ada Student'), '5');
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/users/10/assign-adviser', { adviserId: 5 });
    });

    await user.selectOptions(screen.getByLabelText('Program assignments for Chair Person'), '9');
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/programs/users/11/assignments', {
        programIds: [8, 9],
      });
    });
  });

  test('hides edit and activation controls from Program Chair users', async () => {
    useAuth.mockReturnValue({ user: { id: 2, role: 'admin' } });

    render(<UserManagement />);
    await waitFor(() => {
      expect(screen.getAllByText('Insufficient Permission')).toHaveLength(2);
    });

    const adaRow = screen.getByText('Ada Student').closest('tr');
    expect(within(adaRow).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(adaRow).queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    expect(within(adaRow).queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument();
    expect(within(adaRow).getByLabelText('Assign adviser for Ada Student')).toBeInTheDocument();

    const chairRow = screen.getByText('Chair Person').closest('tr');
    expect(within(chairRow).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(chairRow).queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
  });
});
