import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActivityTimeline from '../ActivityTimeline';

describe('ActivityTimeline', () => {
  test('renders numeric timestamp strings as dates instead of No date', () => {
    render(
      <ActivityTimeline
        items={[
          {
            id: 1,
            action: 'sar.updated',
            resourceLabel: 'Ada Student',
            createdAt: '1700000000000',
            Actor: { firstName: 'Grace', lastName: 'Adviser' },
          },
        ]}
      />,
    );

    expect(screen.queryByText('No date')).not.toBeInTheDocument();
  });
});
