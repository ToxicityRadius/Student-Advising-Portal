jest.mock('../models', () => ({
  ActivityLog: {
    create: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  warn: jest.fn(),
}));

const { ActivityLog } = require('../models');
const logger = require('../utils/logger');
const ActivityLogService = require('../services/ActivityLogService');

describe('ActivityLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('logSafe creates an activity log with normalized metadata', async () => {
    ActivityLog.create.mockResolvedValue({ id: 9 });

    await expect(
      ActivityLogService.logSafe({
        programId: '3',
        actorId: '7',
        action: 'user.status_toggled',
        resourceType: 'user',
        resourceId: '12',
        resourceLabel: 'Ada Lovelace',
        targetUserId: '12',
        metadata: { active: false },
      }),
    ).resolves.toBeUndefined();

    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        programId: 3,
        actorId: 7,
        action: 'user.status_toggled',
        resourceType: 'user',
        resourceId: '12',
        resourceLabel: 'Ada Lovelace',
        targetUserId: 12,
        metadata: { active: false },
        createdAt: expect.any(Number),
      }),
    );
  });

  test('logSafe swallows write failures and logs a warning', async () => {
    ActivityLog.create.mockRejectedValue(new Error('db unavailable'));

    await expect(
      ActivityLogService.logSafe({
        actorId: 7,
        action: 'sar.updated',
        resourceType: 'sar',
        resourceId: 4,
      }),
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        action: 'sar.updated',
        resourceType: 'sar',
        resourceId: '4',
      }),
      'Activity log write failed',
    );
  });
});
