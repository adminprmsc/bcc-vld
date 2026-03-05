const { User } = require('../models-sql');
const { Op } = require('sequelize');

const TEHSIL_SCOPE_ROLES = new Set([
  'dm tehsil',
  'tehsil dm',
  'tehsil manager',
  'tm',
  'bcc officer',
  'bcc officer tehsil',
  'ra environment'
]);

function normaliseText(value) {
  return (value ?? '').toString().trim();
}

function normaliseRole(value) {
  return normaliseText(value).toLowerCase();
}

function needsTehsilScope(role) {
  return TEHSIL_SCOPE_ROLES.has(normaliseRole(role));
}

function collectTehsilValues(userDoc) {
  const values = new Set();
  const push = (input) => {
    const text = normaliseText(input);
    if (text) {
      values.add(text);
    }
  };

  if (!userDoc) {
    return [];
  }

  push(userDoc.address);
  push(userDoc.tehsil);
  push(userDoc.assignedTehsil);

  const profile = userDoc.profile;
  if (profile && typeof profile === 'object') {
    push(profile.tehsil);
    if (Array.isArray(profile.tehsils)) {
      profile.tehsils.forEach(push);
    }
  }

  const assignedArrays = [
    userDoc.assignedTehsils,
    userDoc.tehsils,
    userDoc.tehsilAssignments
  ];
  assignedArrays.forEach((entry) => {
    if (Array.isArray(entry)) {
      entry.forEach(push);
    }
  });

  return Array.from(values);
}

async function resolveUserTehsils(userContext) {
  if (!needsTehsilScope(userContext?.role)) {
    return [];
  }
  const userId = userContext?.userId || userContext?.id || userContext?._id;
  if (!userId) {
    return [];
  }
  const user = await User.findByPk(userId, {
    attributes: ['id', 'address', 'phone']
  });
  if (!user) {
    return [];
  }
  return collectTehsilValues(user);
}

/**
 * Build a Sequelize WHERE clause that scopes by tehsil.
 * Returns an object to merge into a `where` clause, or null if no scope needed.
 */
function buildTehsilScopeQuery(tehsils, fieldPath = 'tehsil') {
  if (!Array.isArray(tehsils) || tehsils.length === 0) {
    return null;
  }
  if (tehsils.length === 1) {
    return {
      [fieldPath]: { [Op.like]: tehsils[0] }
    };
  }
  return {
    [fieldPath]: {
      [Op.in]: tehsils
    }
  };
}

function tehsilMatches(tehsils, candidate) {
  if (!Array.isArray(tehsils) || tehsils.length === 0) {
    return false;
  }
  const candidateKey = normaliseText(candidate).toLowerCase();
  if (!candidateKey) {
    return false;
  }
  return tehsils.some((value) => normaliseText(value).toLowerCase() === candidateKey);
}

module.exports = {
  needsTehsilScope,
  resolveUserTehsils,
  buildTehsilScopeQuery,
  tehsilMatches,
  normaliseText
};
