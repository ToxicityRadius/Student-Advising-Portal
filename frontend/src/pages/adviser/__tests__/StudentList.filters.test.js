import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudentList from '../StudentList';
import api from '../../../utils/api';
import { fetchCurriculumsCached } from '../../../utils/curriculumsCache';

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../../utils/curriculumsCache', () => ({
  fetchCurriculumsCached: jest.fn(),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'adviser' } }),
}));

jest.mock('../../../components/adviser/AdviserLayout', () => {
  return function MockAdviserLayout({ children, activePage }) {
    return <div data-active-page={activePage}>{children}</div>;
  };
});

jest.mock('../../../components/adviser/CreateSARModal', () => {
  return function MockCreateSARModal() {
    return null;
  };
});

jest.mock('../../../components/adviser/BulkSARImportModal', () => {
  return function MockBulkSARImportModal() {
    return null;
  };
});

jest.mock('../../../components/PaginationControls', () => {
  return function MockPaginationControls() {
    return <div data-testid="pagination-controls" />;
  };
});

const renderStudentList = (initialEntry = '/adviser/students') =>
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[initialEntry]}
    >
      <Routes>
        <Route path="/adviser/students" element={<StudentList />} />
      </Routes>
    </MemoryRouter>,
  );

describe('StudentList queue filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/programs') {
        return Promise.resolve({
          data: { data: [{ id: 8, code: 'BSCPE', name: 'Computer Engineering' }] },
        });
      }
      if (url === '/sars') {
        return Promise.resolve({
          data: {
            items: [
              {
                id: 42,
                studentName: 'Ada Student',
                studentNumber: '2025-0001',
                email: 'ada@tip.edu.ph',
                yearLevel: 2,
                isLinkedToAccount: false,
                Program: { code: 'BSCPE' },
                Curriculum: { name: 'BSCPE 2025' },
                Student: {},
              },
            ],
            meta: { page: 1, pageSize: 12, totalItems: 1, totalPages: 1 },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    fetchCurriculumsCached.mockResolvedValue({
      items: [{ id: 3, name: 'BSCPE 2025', isActive: true }],
    });
  });

  test('quick filters update SAR query params and refresh rows', async () => {
    const user = userEvent.setup();
    renderStudentList();

    expect(await screen.findByText('Ada Student')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Assigned to Me' }));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/sars',
        expect.objectContaining({
          params: expect.objectContaining({ scope: 'assigned' }),
        }),
      );
    });

    await user.click(screen.getByRole('button', { name: 'Missing Plan' }));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/sars',
        expect.objectContaining({
          params: expect.objectContaining({ scope: 'all', hasStudyPlan: 'false' }),
        }),
      );
    });

    await user.click(screen.getByRole('button', { name: 'Needs Review' }));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/sars',
        expect.objectContaining({
          params: expect.objectContaining({ scope: 'all', needsRevalidation: 'true' }),
        }),
      );
    });
  });

  test('initializes filters from query params for direct queue links', async () => {
    renderStudentList('/adviser/students?scope=created&programId=8&hasStudyPlan=false');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/sars',
        expect.objectContaining({
          params: expect.objectContaining({
            scope: 'created',
            programId: '8',
            hasStudyPlan: 'false',
          }),
        }),
      );
    });
  });
});
