/**
 * Audit Middleware
 * Automatically captures API actions for audit logging
 */

const AuditLog = require('../models-sql/AuditLog');

// Actions that should be logged
const AUDITABLE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths to skip auditing (health checks, static assets, etc.)
const SKIP_PATHS = [
  '/api/health',
  '/api/ping',
  '/favicon.ico',
  /^\/api\/audit-logs/, // Prevent recursive logging
];

// Entity type mapping based on path
const ENTITY_MAP = {
  '/api/users': 'User',
  '/api/auth': 'Auth',
  '/api/requisitions': 'Requisition',
  '/api/consultant-plans': 'ConsultantPlan',
  '/api/water-quality': 'WaterQualitySample',
  '/api/support': 'SupportRequest',
  '/api/access-requests': 'AccessRequest',
  '/api/notifications': 'Notification',
  '/api/dashboard': 'Dashboard'
};

// Action mapping based on method and path
function determineAction(req) {
  const method = req.method;
  const path = req.originalUrl || req.path;
  
  // Login/logout detection
  if (path.includes('/auth/login')) return 'LOGIN';
  if (path.includes('/auth/logout')) return 'LOGOUT';
  if (path.includes('/auth/register')) return 'REGISTER';
  
  // Workflow actions
  if (path.includes('/forward') || path.includes('/assign')) return 'WORKFLOW_FORWARD';
  if (path.includes('/approve')) return 'WORKFLOW_APPROVE';
  if (path.includes('/reject') || path.includes('/revert')) return 'WORKFLOW_REJECT';
  if (path.includes('/close')) return 'WORKFLOW_CLOSE';
  
  // Standard CRUD
  switch (method) {
    case 'POST': return 'CREATE';
    case 'PUT':
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    case 'GET': return 'READ';
    default: return method;
  }
}

// Extract entity type from path
function getEntityType(path) {
  for (const [prefix, type] of Object.entries(ENTITY_MAP)) {
    if (path.startsWith(prefix)) {
      return type;
    }
  }
  return 'Unknown';
}

// Extract entity ID from path
function getEntityId(req) {
  const path = req.originalUrl || req.path;
  const match = path.match(/\/([a-f0-9]{24}|[0-9]+)(?:\/|$)/i);
  return match ? match[1] : null;
}

// Should this request be audited?
function shouldAudit(req) {
  const path = req.originalUrl || req.path;
  
  // Skip excluded paths
  for (const skip of SKIP_PATHS) {
    if (typeof skip === 'string' && path.startsWith(skip)) return false;
    if (skip instanceof RegExp && skip.test(path)) return false;
  }
  
  // Log all modifying methods
  if (AUDITABLE_METHODS.includes(req.method)) return true;
  
  // Optionally log important GET requests (configurable)
  if (process.env.AUDIT_READS === 'true' && req.method === 'GET') {
    // Only log specific entity reads, not list queries
    return getEntityId(req) !== null;
  }
  
  return false;
}

/**
 * Audit middleware - captures request/response for logging
 */
function auditMiddleware(req, res, next) {
  if (!shouldAudit(req)) {
    return next();
  }
  
  const startTime = Date.now();
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  let responseBody = null;
  let responseStatus = null;
  
  // Capture response
  res.json = function(body) {
    responseBody = body;
    responseStatus = res.statusCode;
    return originalJson(body);
  };
  
  res.send = function(body) {
    if (!responseBody && typeof body === 'object') {
      responseBody = body;
    }
    responseStatus = res.statusCode;
    return originalSend(body);
  };
  
  // After response is sent
  res.on('finish', async () => {
    try {
      const durationMs = Date.now() - startTime;
      const action = determineAction(req);
      const entityType = getEntityType(req.originalUrl || req.path);
      const entityId = getEntityId(req);
      
      // Determine status based on HTTP status code
      let status = 'success';
      let errorMessage = null;
      
      if (res.statusCode >= 400) {
        status = res.statusCode >= 500 ? 'failure' : 'warning';
        errorMessage = responseBody?.message || responseBody?.msg || responseBody?.error;
      }
      
      // Build description
      let description = `${req.method} ${req.originalUrl}`;
      if (responseBody?.message || responseBody?.msg) {
        description += ` - ${responseBody.message || responseBody.msg}`;
      }
      
      await AuditLog.logAction({
        action,
        entityType,
        entityId,
        description,
        user: req.user,
        req,
        newValues: req.method === 'POST' ? req.body : undefined,
        oldValues: req.method === 'DELETE' ? { deleted: true } : undefined,
        metadata: {
          httpStatus: res.statusCode,
          query: Object.keys(req.query).length > 0 ? req.query : undefined
        },
        status,
        errorMessage,
        durationMs
      });
    } catch (error) {
      console.error('Audit middleware error:', error);
      // Don't disrupt the response
    }
  });
  
  next();
}

/**
 * Manual audit logging for custom actions
 * Use this when you need more control over what's logged
 */
async function logAuditEvent(options) {
  return AuditLog.logAction(options);
}

/**
 * Express error handler that logs errors
 */
function auditErrorHandler(err, req, res, next) {
  AuditLog.logAction({
    action: 'ERROR',
    entityType: getEntityType(req.originalUrl || req.path),
    entityId: getEntityId(req),
    description: `Error: ${err.message}`,
    user: req.user,
    req,
    status: 'failure',
    errorMessage: err.stack || err.message,
    metadata: {
      errorName: err.name,
      errorCode: err.code
    }
  }).catch(console.error);
  
  next(err);
}

module.exports = {
  auditMiddleware,
  logAuditEvent,
  auditErrorHandler,
  AuditLog
};
