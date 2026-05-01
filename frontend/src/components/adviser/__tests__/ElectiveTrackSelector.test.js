import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ElectiveTrackSelector from '../ElectiveTrackSelector';
import api from '../../../utils/api';

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('ElectiveTrackSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        data: [
          { id: 1, name: 'Systems Administration' },
          { id: 2, name: 'Cybersecurity' },
        ],
      },
    });
    api.patch.mockResolvedValue({
      data: { data: { id: 42, electiveTrackId: 2 } },
    });
  });

  test('lets advisers override an already selected student elective track', async () => {
    const user = userEvent.setup();
    const onTrackSelected = jest.fn();

    render(
      <ElectiveTrackSelector
        sarId={42}
        curriculumId={10}
        selectedTrackId={1}
        onTrackSelected={onTrackSelected}
      />,
    );

    const selector = await screen.findByLabelText('Select elective track');
    await waitFor(() => expect(selector).toHaveValue('1'));

    expect(selector).not.toBeDisabled();

    await user.selectOptions(selector, '2');
    await user.click(screen.getByRole('button', { name: /update track/i }));

    expect(api.patch).toHaveBeenCalledWith('/sars/42/elective-track', {
      electiveTrackId: 2,
    });
    expect(onTrackSelected).toHaveBeenCalledWith({ id: 42, electiveTrackId: 2 });
  });
});
