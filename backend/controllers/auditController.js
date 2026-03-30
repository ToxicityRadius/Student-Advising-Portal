const { Op } = require('sequelize');
const { AuditLog, User } = require('../models');

// @desc   Get audit logs (paginated, filterable)
// @route  GET /api/admin/audit-logs
// @access admin
exports.getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 25,
      action,
      resource,
      userId,
      startDate,
      endDate,
      search,
    } = req.query;

    const limit = Math.min(Math.max(Number(pageSize) || 25, 1), 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const where = {};

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = resource;
    }

    if (userId) {
      where.userId = Number(userId);
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    if (search) {
      where[Op.or] = [
        { action: { [Op.iLike]: `%${search}%` } },
        { resource: { [Op.iLike]: `%${search}%` } },
        { resourceId: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: {
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get distinct action values for filter dropdown
// @route  GET /api/admin/audit-logs/actions
// @access admin
exports.getAuditActions = async (_req, res, next) => {
  try {
    const results = await AuditLog.findAll({
      attributes: [[AuditLog.sequelize.fn('DISTINCT', AuditLog.sequelize.col('action')), 'action']],
      order: [['action', 'ASC']],
      raw: true,
    });

    return res.status(200).json({
      success: true,
      data: results.map((r) => r.action),
    });
  } catch (error) {
    next(error);
  }
};
