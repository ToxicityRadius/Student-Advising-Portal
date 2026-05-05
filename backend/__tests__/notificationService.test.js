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

describe('NotificationService prerequisite override notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Notification.create.mockResolvedValue({ id: 1 });
  });

  test('creates a warning notification for prerequisite override requests', async () => {
    await NotificationService.notify({
      recipientId: 10,
      actorId: 20,
      category: 'prerequisite_override_requested',
      resourceType: 'study_plan_version',
      resourceId: 30,
      meta: {
        adviserName: 'Grace Adviser',
        prerequisiteCode: 'CALC101',
        dependentCode: 'CALC102',
      },
    });

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 10,
        actorId: 20,
        type: 'warning',
        category: 'prerequisite_override_requested',
        title: 'Prerequisite override request',
        body: expect.stringContaining('CALC101 and CALC102'),
        resourceType: 'study_plan_version',
        resourceId: 30,
        targetPath: '/admin/prerequisite-overrides?status=pending',
        isRead: false,
      }),
    );
  });

  test('uses an explicit target path when provided', async () => {
    await NotificationService.notify({
      recipientId: 10,
      actorId: 20,
      category: 'grades_entered',
      resourceType: 'study_plan_version',
      resourceId: 30,
      targetPath: '/adviser/students/42/grades',
      meta: { gradeCount: 3 },
    });

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'grades_entered',
        targetPath: '/adviser/students/42/grades',
      }),
    );
  });

  test('falls back to safe category target paths when no explicit target is provided', async () => {
    await NotificationService.notify({
      recipientId: 10,
      actorId: 20,
      category: 'study_plan_regenerated',
      resourceType: 'study_plan_version',
      resourceId: 30,
      meta: { versionNumber: 2 },
    });

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'study_plan_regenerated',
        targetPath: '/plan-of-study',
      }),
    );
  });

  test('includes every requested prerequisite override pair when a summary is provided', async () => {
    await NotificationService.notify({
      recipientId: 10,
      actorId: 20,
      category: 'prerequisite_override_requested',
      resourceType: 'study_plan_version',
      resourceId: 30,
      meta: {
        adviserName: 'Grace Adviser',
        overridePairSummary: 'CALC101 and CALC102; PHYS101 and PHYS102',
      },
    });

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'prerequisite_override_requested',
        body: expect.stringContaining('CALC101 and CALC102; PHYS101 and PHYS102'),
      }),
    );
  });

  test('creates adviser decision notifications for approved and rejected overrides', async () => {
    await NotificationService.notify({
      recipientId: 20,
      actorId: 10,
      category: 'prerequisite_override_approved',
      resourceType: 'prerequisite_override_request',
      resourceId: 40,
      meta: {
        prerequisiteCode: 'CALC101',
        dependentCode: 'CALC102',
        sarId: 7,
        versionId: 12,
      },
    });

    await NotificationService.notify({
      recipientId: 20,
      actorId: 10,
      category: 'prerequisite_override_rejected',
      resourceType: 'prerequisite_override_request',
      resourceId: 41,
      meta: { prerequisiteCode: 'CALC101', dependentCode: 'CALC102' },
    });

    expect(Notification.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'success',
        category: 'prerequisite_override_approved',
        title: 'Prerequisite override approved',
        body: expect.stringContaining('CALC101 and CALC102'),
        targetPath: '/adviser/students/7/plan/12/review',
      }),
    );
    expect(Notification.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'warning',
        category: 'prerequisite_override_rejected',
        title: 'Prerequisite override rejected',
        body: expect.stringContaining('CALC101 and CALC102'),
      }),
    );
  });
});
