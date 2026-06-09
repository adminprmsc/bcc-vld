/**
 * Audit Log Model - MySQL/Sequelize
 * Captures all user actions in the system for compliance and debugging
 */

const { sequelize, Sequelize, DataTypes } = require('../config/database');

class AuditLog extends Sequelize.Model {}

AuditLog.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  
  // Action information
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Action type: CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.'
  },
  
  entityType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'entity_type',
    comment: 'Type of entity: User, Requisition, ConsultantPlan, etc.'
  },
  
  entityId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'entity_id',
    comment: 'ID of the affected entity'
  },
  
  // Description of what happened
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Human-readable description of the action'
  },
  
  // Who performed the action
  userId: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    field: 'user_id',
    comment: 'User who performed the action'
  },
  
  userName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'user_name',
    comment: 'Cached user name for quick reference'
  },
  
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'user_email',
    comment: 'Cached user email'
  },
  
  userRole: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'user_role',
    comment: 'User role at time of action'
  },
  
  // Request context
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
    comment: 'Client IP address (supports IPv6)'
  },
  
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent',
    comment: 'Browser/client user agent string'
  },
  
  requestMethod: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'request_method',
    comment: 'HTTP method: GET, POST, PUT, DELETE, PATCH'
  },
  
  requestPath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'request_path',
    comment: 'API endpoint path'
  },
  
  // Data tracking
  oldValues: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'old_values',
    comment: 'Previous state before the change'
  },
  
  newValues: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'new_values',
    comment: 'New state after the change'
  },
  
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context or data'
  },
  
  // Status and result
  status: {
    type: DataTypes.ENUM('success', 'failure', 'warning'),
    defaultValue: 'success',
    comment: 'Result status of the action'
  },
  
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message',
    comment: 'Error details if action failed'
  },
  
  // Timing
  durationMs: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'duration_ms',
    comment: 'Time taken to complete the action in milliseconds'
  },
  
  // Session tracking
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'session_id',
    comment: 'Session identifier for grouping related actions'
  }
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // Audit logs are immutable
  indexes: [
    { fields: ['action'] },
    { fields: ['entity_type'] },
    { fields: ['entity_id'] },
    { fields: ['user_id'] },
    { fields: ['created_at'] },
    { fields: ['status'] },
    { fields: ['entity_type', 'entity_id'] },
    { fields: ['user_id', 'created_at'] }
  ]
});

// Static methods for creating audit logs
AuditLog.logAction = async function(options) {
  const {
    action,
    entityType,
    entityId,
    description,
    user,
    req,
    oldValues,
    newValues,
    metadata,
    status = 'success',
    errorMessage,
    durationMs
  } = options;

  try {
    return await this.create({
      action,
      entityType,
      entityId: entityId?.toString(),
      description,
      userId: user?.id || user?._id,
      userName: user?.name,
      userEmail: user?.email,
      userRole: user?.role,
      ipAddress: req ? getClientIp(req) : null,
      userAgent: req?.headers?.['user-agent'],
      requestMethod: req?.method,
      requestPath: req?.originalUrl || req?.path,
      oldValues: sanitizeData(oldValues),
      newValues: sanitizeData(newValues),
      metadata: sanitizeData(metadata),
      status,
      errorMessage,
      durationMs,
      sessionId: req?.sessionID || req?.headers?.['x-session-id']
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
};

// Convenience methods for common actions
AuditLog.logCreate = function(entityType, entity, user, req, metadata) {
  return this.logAction({
    action: 'CREATE',
    entityType,
    entityId: entity?.id || entity?._id,
    description: `Created ${entityType}`,
    user,
    req,
    newValues: entity,
    metadata
  });
};

AuditLog.logRead = function(entityType, entityId, user, req, metadata) {
  return this.logAction({
    action: 'READ',
    entityType,
    entityId,
    description: `Viewed ${entityType}`,
    user,
    req,
    metadata
  });
};

AuditLog.logUpdate = function(entityType, entityId, oldValues, newValues, user, req, metadata) {
  return this.logAction({
    action: 'UPDATE',
    entityType,
    entityId,
    description: `Updated ${entityType}`,
    user,
    req,
    oldValues,
    newValues,
    metadata
  });
};

AuditLog.logDelete = function(entityType, entityId, oldValues, user, req, metadata) {
  return this.logAction({
    action: 'DELETE',
    entityType,
    entityId,
    description: `Deleted ${entityType}`,
    user,
    req,
    oldValues,
    metadata
  });
};

AuditLog.logLogin = function(user, req, success = true, errorMessage = null) {
  return this.logAction({
    action: 'LOGIN',
    entityType: 'Session',
    entityId: user?.id || user?._id,
    description: success ? 'User logged in' : 'Login attempt failed',
    user,
    req,
    status: success ? 'success' : 'failure',
    errorMessage,
    metadata: { email: user?.email }
  });
};

AuditLog.logLogout = function(user, req) {
  return this.logAction({
    action: 'LOGOUT',
    entityType: 'Session',
    entityId: user?.id || user?._id,
    description: 'User logged out',
    user,
    req
  });
};

AuditLog.logWorkflowAction = function(entityType, entityId, action, fromStatus, toStatus, user, req, metadata) {
  return this.logAction({
    action: `WORKFLOW_${action.toUpperCase()}`,
    entityType,
    entityId,
    description: `Workflow: ${action} - ${fromStatus} → ${toStatus}`,
    user,
    req,
    oldValues: { status: fromStatus },
    newValues: { status: toStatus },
    metadata
  });
};

// Helper functions
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip;
}

function sanitizeData(data) {
  if (!data) return null;
  
  // Convert ORM instances to plain objects
  if (typeof data.toJSON === 'function') {
    data = data.toJSON();
  } else if (typeof data.toObject === 'function') {
    data = data.toObject();
  }
  
  // Deep clone and remove sensitive fields
  const sanitized = JSON.parse(JSON.stringify(data));
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];
  
  function removeSensitive(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key of Object.keys(obj)) {
      if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        removeSensitive(obj[key]);
      }
    }
  }
  
  removeSensitive(sanitized);
  return sanitized;
}

module.exports = AuditLog;
