/**
 * Shared test utilities for frontend component tests.
 *
 * Provides renderWithProviders() that wraps components in
 * AuthContext, NotificationContext, and MemoryRouter.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Render a component wrapped in MemoryRouter + common providers.
 *
 * @param {React.ReactElement} ui - Component to render.
 * @param {Object} options
 * @param {string[]} options.initialEntries - MemoryRouter initial entries.
 * @returns {RenderResult}
 */
export function renderWithRouter(ui, { initialEntries = ['/'] } = {}) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

/**
 * Create a mock auth context value.
 */
export function mockAuthValue(overrides = {}) {
  return {
    user: null,
    loading: false,
    isAuthenticated: false,
    isAdmin: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    setUser: jest.fn(),
    ...overrides,
  };
}

/**
 * Create a mock notification context value.
 */
export function mockNotificationValue(overrides = {}) {
  return {
    notifications: [],
    unreadCount: 0,
    refresh: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    ...overrides,
  };
}
