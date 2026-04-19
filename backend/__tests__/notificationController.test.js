jest.mock('../services/NotificationService', () => ({
  getNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
}));

const NotificationService = require('../services/NotificationService');
const { getNotifications } = require('../controllers/notificationController');

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('notificationController.getNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NotificationService.getNotifications.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 50,
      totalItems: 0,
    });
  });

  test('passes valid type filter to NotificationService', async () => {
    const req = {
      user: { id: 99 },
      query: { page: '1', pageSize: '20', type: 'info', unreadOnly: 'true' },
    };
    const res = createRes();
    const next = jest.fn();

    await getNotifications(req, res, next);

    expect(NotificationService.getNotifications).toHaveBeenCalledWith(99, {
      page: 1,
      pageSize: 20,
      unreadOnly: true,
      type: 'info',
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('sanitizes unsupported type filter to null', async () => {
    const req = {
      user: { id: 50 },
      query: { type: 'unsupported-type' },
    };
    const res = createRes();
    const next = jest.fn();

    await getNotifications(req, res, next);

    expect(NotificationService.getNotifications).toHaveBeenCalledWith(50, {
      page: 1,
      pageSize: 50,
      unreadOnly: false,
      type: null,
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
