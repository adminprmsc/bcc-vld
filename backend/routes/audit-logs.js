/**
 * Audit Log Routes
 * API endpoints for viewing and searching audit logs
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const AuditLog = require('../models-sql/AuditLog');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Only Super Admin and Admin can view audit logs
const adminOnly = requireRole('Super Admin', 'Admin');

/**
 * GET /api/audit-logs
 * List audit logs with filtering and pagination
 */
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      entityType,
      entityId,
      userId,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // Build filter conditions
    if (action) {
      where.action = action;
    }
    
    if (entityType) {
      where.entityType = entityType;
    }
    
    if (entityId) {
      where.entityId = entityId;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.created_at[Op.lte] = new Date(endDate);
      }
    }
    
    if (search) {
      where[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        { userName: { [Op.like]: `%${search}%` } },
        { userEmail: { [Op.like]: `%${search}%` } },
        { requestPath: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows: logs, count: total } = await AuditLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/audit-logs/stats
 * Get audit log statistics
 */
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.created_at[Op.lte] = new Date(endDate);
      }
    }

    // Get counts by action
    const actionStats = await AuditLog.findAll({
      where,
      attributes: [
        'action',
        [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
      ],
      group: ['action'],
      raw: true
    });

    // Get counts by entity type
    const entityStats = await AuditLog.findAll({
      where,
      attributes: [
        'entityType',
        [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
      ],
      group: ['entityType'],
      raw: true
    });

    // Get counts by status
    const statusStats = await AuditLog.findAll({
      where,
      attributes: [
        'status',
        [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get top users by activity
    const topUsers = await AuditLog.findAll({
      where: {
        ...where,
        userId: { [Op.ne]: null }
      },
      attributes: [
        'userId',
        'userName',
        'userRole',
        [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
      ],
      group: ['userId', 'userName', 'userRole'],
      order: [[AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Total count
    const totalLogs = await AuditLog.count({ where });

    res.json({
      totalLogs,
      byAction: actionStats,
      byEntityType: entityStats,
      byStatus: statusStats,
      topUsers
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ message: 'Failed to fetch audit statistics' });
  }
});

/**
 * GET /api/audit-logs/entity/:entityType/:entityId
 * Get audit trail for a specific entity
 */
router.get('/entity/:entityType/:entityId', auth, adminOnly, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 100 } = req.query;

    const logs = await AuditLog.findAll({
      where: { entityType, entityId },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching entity audit trail:', error);
    res.status(500).json({ message: 'Failed to fetch entity audit trail' });
  }
});

/**
 * GET /api/audit-logs/user/:userId
 * Get all actions by a specific user
 */
router.get('/user/:userId', auth, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: logs, count: total } = await AuditLog.findAndCountAll({
      where: { userId },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch user audit logs' });
  }
});

/**
 * GET /api/audit-logs/:id
 * Get single audit log entry with full details
 */
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    
    if (!log) {
      return res.status(404).json({ message: 'Audit log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ message: 'Failed to fetch audit log' });
  }
});

/**
 * GET /api/audit-logs/actions
 * Get list of unique action types for filtering
 */
router.get('/meta/actions', auth, adminOnly, async (req, res) => {
  try {
    const actions = await AuditLog.findAll({
      attributes: [[AuditLog.sequelize.fn('DISTINCT', AuditLog.sequelize.col('action')), 'action']],
      raw: true
    });

    res.json(actions.map(a => a.action));
  } catch (error) {
    console.error('Error fetching action types:', error);
    res.status(500).json({ message: 'Failed to fetch action types' });
  }
});

/**
 * GET /api/audit-logs/entities
 * Get list of unique entity types for filtering
 */
router.get('/meta/entities', auth, adminOnly, async (req, res) => {
  try {
    const entities = await AuditLog.findAll({
      attributes: [[AuditLog.sequelize.fn('DISTINCT', AuditLog.sequelize.col('entity_type')), 'entityType']],
      raw: true
    });

    res.json(entities.map(e => e.entityType));
  } catch (error) {
    console.error('Error fetching entity types:', error);
    res.status(500).json({ message: 'Failed to fetch entity types' });
  }
});

module.exports = router;
