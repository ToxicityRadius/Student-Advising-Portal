jest.mock('../models', () => ({
  Notification: {
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  User: {},
}));

const { Notification } = require('../models');
const NotificationService = require('../services/NotificationService');

describe('NotificationService.getNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('applies unreadOnly and type filters with pagination', async () => {
    Notification.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await NotificationService.getNotifications(42, {
      page: 2,
      pageSize: 10,
      unreadOnly: true,
      type: 'info',
    });

    expect(Notification.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          recipientId: 42,
          isRead: false,
          type: 'info',
        },
        order: [['createdAt', 'DESC']],
        limit: 10,
        offset: 10,
      }),
    );
  });

  test('does not include type in where clause when type is not provided', async () => {
    Notification.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await NotificationService.getNotifications(5, {
      page: 1,
      pageSize: 20,
      unreadOnly: false,
    });

    expect(Notification.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          recipientId: 5,
        },
        limit: 20,
        offset: 0,
      }),
    );
  });
});
