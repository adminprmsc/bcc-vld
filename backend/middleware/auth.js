const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// In production, JWT_SECRET must be set via environment variable
// In development, generate a random secret per process (still warns)
const isProduction = process.env.NODE_ENV === 'production';
let JWT_SECRET;

if (process.env.JWT_SECRET) {
  JWT_SECRET = process.env.JWT_SECRET;
} else if (isProduction) {
  // This should never happen if app.js validation runs first, but extra safety
  console.error('FATAL: JWT_SECRET must be set in production environment');
  process.exit(1);
} else {
  // Development fallback - generate random secret per process
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('WARNING: JWT_SECRET not set. Using random development secret.');
  console.warn('         Tokens will be invalidated on server restart.');
  console.warn('         Set JWT_SECRET environment variable for persistent sessions.');
}

function authMiddleware(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
}

// Role synonyms for case-insensitive / alias-tolerant role checks
const ROLE_SYNONYMS = {
  'infra engineer': ['Infra Engineer', 'Infra Head', 'Infrastructure Engineer', 'Infra Incharge'],
  'infra head': ['Infra Head', 'Infra Engineer'],
  'cid': ['CID', 'CID Officer'],
  'cid officer': ['CID Officer', 'CID'],
  'bcc officer tehsil': ['BCC Officer Tehsil', 'BCC Officer'],
  'bcc officer': ['BCC Officer', 'BCC Officer Tehsil'],
  'bcc specialist': ['BCC Specialist'],
  'dm tehsil': ['DM Tehsil', 'Tehsil DM'],
  'tehsil dm': ['Tehsil DM', 'DM Tehsil'],
  'edcs consultant': ['EDCS Consultant', 'Consultant', 'EDCS', 'EDCS User'],
  'edcs user': ['EDCS User', 'EDCS Consultant', 'EDCS'],
  'tehsil manager': ['Tehsil Manager', 'TM', 'TM User'],
  'tm': ['Tehsil Manager', 'TM', 'TM User'],
  'wb user': ['WB User', 'World Bank User', 'WB'],
  'wb': ['WB User', 'World Bank User', 'WB']
};

function expandRoleAliases(roleInput) {
  const roles = Array.isArray(roleInput) ? roleInput : [roleInput];
  const expanded = new Set();
  roles.forEach(role => {
    const raw = (role || '').toString().trim();
    if (!raw) return;
    expanded.add(raw);
    const aliasList = ROLE_SYNONYMS[raw.toLowerCase()];
    if (aliasList) {
      aliasList.forEach(alias => expanded.add(alias));
    }
  });
  return Array.from(expanded);
}

// Middleware factory: only allows requests whose req.user.role matches one of the given roles (or their aliases)
function requireRole(...allowedRoles) {
  const expandedRoles = expandRoleAliases(allowedRoles).map(role => role.toString().trim().toLowerCase());
  const allowedSet = new Set(expandedRoles);
  return (req, res, next) => {
    const userRole = (req.user?.role || '').toString().trim();
    if (!userRole) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }
    if (!allowedSet.has(userRole.toLowerCase())) {
      return res.status(403).json({ msg: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// Export both the middleware and the JWT_SECRET
authMiddleware.JWT_SECRET = JWT_SECRET;
authMiddleware.requireRole = requireRole;
authMiddleware.expandRoleAliases = expandRoleAliases;
module.exports = authMiddleware;
