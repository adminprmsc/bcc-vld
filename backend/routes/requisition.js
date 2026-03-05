const express = require('express');
const router = express.Router();
// Debug: log incoming requests to help trace 404s
router.use((req, res, next) => {
  console.log('[requisition.router] %s %s from %s', req.method, req.originalUrl, req.ip);
  next();
});
const { Op } = require('sequelize');
const {
  Requisition,
  RequisitionActivityLog,
  RequisitionCivilStructure,
  RequisitionMachinery,
  RequisitionProgressUpdate,
  User,
  sequelize
} = require('../models-sql');
const auth = require('../middleware/auth');
const { requireRole, expandRoleAliases } = auth;
const fs = require('fs');
const PDFDocument = require('pdfkit');
const {
  requisitionValidation,
  handleValidationErrors,
  validateObjectId
} = require('../middleware/validators');

const LAND_ACQUISITION_STATUSES = [
  'Identification Pending',
  'Document Collection',
  'Verification Scheduled',
  'Verification Complete',
  'Submitted for Approval',
  'Approved',
  'Acquisition Complete',
  'Rejected'
];
const LAND_ACQUISITION_STATUS_SET = new Set(LAND_ACQUISITION_STATUSES.map(status => status.toLowerCase()));
const BCC_LAND_STATUS_SET = new Set([
  'assigned to bcc',
  'land acquisition updated',
  'donor data uploaded',
  'documentation added',
  ...LAND_ACQUISITION_STATUSES.map(status => status.toLowerCase())
]);

const WORKFLOW_STATUSES = {
  PENDING_DM: 'Pending DM Review',
  PENDING_BCC: 'Pending BCC Officer Review',
  PENDING_TM: 'Pending TM Review',
  PENDING_CHIEF: 'Pending BCC Specialist Review',
  PENDING_WB_DISPATCH: 'Pending WB Dispatch',
  PENDING_WB_APPROVAL: 'Pending WB Approval',
  WB_APPROVED: 'WB Approved',
  MARKED_TO_TM: 'Marked to TM',
  PENDING_BCC_CLOSURE: 'Pending BCC Closure',
  CLOSED: 'Closed'
};

const WORKFLOW_STATUS_LIST = Object.values(WORKFLOW_STATUSES);

const WORKFLOW_ASSIGNMENT_ROLES = {
  [WORKFLOW_STATUSES.PENDING_DM]: ['DM Tehsil', 'Tehsil DM'],
  [WORKFLOW_STATUSES.PENDING_BCC]: ['BCC Officer Tehsil', 'BCC Officer'],
  [WORKFLOW_STATUSES.PENDING_TM]: ['Tehsil Manager'],
  [WORKFLOW_STATUSES.PENDING_CHIEF]: ['BCC Specialist'],
  [WORKFLOW_STATUSES.PENDING_WB_DISPATCH]: ['BCC Officer Tehsil', 'BCC Officer'],
  [WORKFLOW_STATUSES.PENDING_WB_APPROVAL]: ['WB User'],
  [WORKFLOW_STATUSES.WB_APPROVED]: ['BCC Specialist'],
  [WORKFLOW_STATUSES.MARKED_TO_TM]: ['Tehsil Manager'],
  [WORKFLOW_STATUSES.PENDING_BCC_CLOSURE]: ['BCC Officer Tehsil', 'BCC Officer'],
  [WORKFLOW_STATUSES.CLOSED]: []
};

// ============================================================================
// Standard Includes (replaces REQUISITION_POPULATE_PATHS)
// ============================================================================
const standardIncludes = [
  { model: User, as: 'requester', attributes: ['id', 'simpleId', 'name', 'email', 'role'] },
  { model: User, as: 'assignee', attributes: ['id', 'simpleId', 'name', 'email', 'role'] },
  {
    model: RequisitionActivityLog,
    as: 'activityLogs',
    include: [{ model: User, as: 'actor', attributes: ['id', 'simpleId', 'name', 'role'] }],
    separate: true,
    order: [['timestamp', 'ASC']]
  },
  {
    model: RequisitionCivilStructure,
    as: 'civilStructures',
    include: [{ model: User, as: 'updater', attributes: ['id', 'name', 'role'] }]
  },
  {
    model: RequisitionMachinery,
    as: 'machinery',
    include: [{ model: User, as: 'updater', attributes: ['id', 'name', 'role'] }]
  },
  {
    model: RequisitionProgressUpdate,
    as: 'progressUpdates',
    include: [{ model: User, as: 'updater', attributes: ['id', 'name', 'role'] }]
  }
];

// ============================================================================
// Helper: reload a requisition with all includes
// ============================================================================
async function reloadRequisition(id) {
  return Requisition.findByPk(id, { include: standardIncludes });
}

// ============================================================================
// Serialize Requisition – transforms flat Sequelize instance back to
// the shape the frontend expects (nested location, mapMarker, etc.)
// ============================================================================
function serializeRequisition(req) {
  if (!req) return req;
  const plain = req.toJSON ? req.toJSON() : req;
  return {
    ...plain,
    _id: plain.id,
    requestedBy: plain.requester || plain.requestedBy,
    assignedTo: plain.assignee || plain.assignedTo,
    activityLog: (plain.activityLogs || []).map(log => ({
      ...log,
      user: log.actor || log.userId,
      _id: log.id
    })),
    location: {
      address: plain.locationAddress || '',
      coordinates: (plain.locationLat != null && plain.locationLng != null)
        ? { lat: Number(plain.locationLat), lng: Number(plain.locationLng) }
        : null
    },
    mapMarker: (plain.mapMarkerLat != null && plain.mapMarkerLng != null)
      ? { lat: Number(plain.mapMarkerLat), lng: Number(plain.mapMarkerLng) }
      : null,
    mapViewport: (plain.mapViewportCenterLat != null && plain.mapViewportCenterLng != null)
      ? {
          center: { lat: Number(plain.mapViewportCenterLat), lng: Number(plain.mapViewportCenterLng) },
          zoom: plain.mapViewportZoom || 0
        }
      : null,
    landAcquisition: {
      type: plain.landAcquisitionType || '',
      status: plain.landAcquisitionStatus || '',
      ...(plain.landAcquisitionData || {}),
      updatedBy: plain.landAcquisitionUpdatedBy,
      updatedAt: plain.landAcquisitionUpdatedAt
    },
    landUtilization: {
      overview: {
        phase: plain.landUtilizationPhase || '',
        summary: plain.landUtilizationSummary || '',
        nextMilestone: plain.landUtilizationNextMilestone || ''
      },
      civilStructures: (plain.civilStructures || []).map(s => ({ ...s, _id: s.id })),
      machinery: (plain.machinery || []).map(m => ({ ...m, _id: m.id })),
      progressUpdates: (plain.progressUpdates || []).map(p => ({ ...p, _id: p.id })),
      gallery: plain.landUtilizationGallery || [],
      updatedBy: plain.landUtilizationUpdatedBy,
      updatedAt: plain.landUtilizationUpdatedAt
    },
    sequenceNumber: plain.sequenceNumber
  };
}

function serializeMany(requisitions) {
  return requisitions.map(serializeRequisition);
}

// ============================================================================
// Helper utilities
// ============================================================================

function normalizeStatus(status) {
  return (status || '').toString().trim().toLowerCase();
}

function statusIn(current, allowed) {
  const normalizedCurrent = normalizeStatus(current);
  if (!Array.isArray(allowed)) {
    return normalizedCurrent === normalizeStatus(allowed);
  }
  return allowed.some(status => normalizeStatus(status) === normalizedCurrent);
}

function resolveId(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    if (value._id) {
      return value._id.toString();
    }
    if (value.id) {
      return value.id.toString();
    }
    if (value.userId) {
      return value.userId.toString();
    }
    const maybe = value.toString?.();
    if (maybe && maybe !== '[object Object]') {
      return maybe;
    }
  }
  return '';
}

function parseJsonField(raw, fallback = {}) {
  if (!raw) {
    return fallback;
  }
  if (typeof raw === 'object') {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function cleanString(value) {
  return (value ?? '').toString().trim();
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function findFirstUserByRole(roleInput) {
  const expandedRoles = expandRoleAliases(roleInput);
  if (!expandedRoles.length) {
    return null;
  }
  const active = await User.findOne({
    where: {
      role: { [Op.in]: expandedRoles },
      activeStatus: { [Op.in]: ['active', 'Active', 'ACTIVE'] }
    },
    order: [['name', 'ASC']]
  });
  if (active) return active;
  return User.findOne({
    where: { role: { [Op.in]: expandedRoles } },
    order: [['name', 'ASC']]
  });
}

async function pickOfficerId(preferredId, fallbackRoles) {
  const resolved = resolveId(preferredId);
  if (resolved) {
    return resolved;
  }
  if (!fallbackRoles || !fallbackRoles.length) {
    return '';
  }
  const fallback = await findFirstUserByRole(fallbackRoles);
  return fallback?.id?.toString() || '';
}

function ensureRemarks(raw, fallback) {
  const text = (raw || '').toString().trim();
  return text || fallback;
}


const multer = require('multer');
const path = require('path');

function deleteFilesQuietly(fileNames) {
  if (!Array.isArray(fileNames) || !fileNames.length) {
    return;
  }
  fileNames.forEach(name => {
    if (!name) {
      return;
    }
    const targetPath = path.join(__dirname, '../uploads', name);
    fs.unlink(targetPath, () => {});
  });
}

function mergeGallery(existing, additions) {
  const current = Array.isArray(existing) ? existing : [];
  const next = Array.isArray(additions) ? additions.filter(Boolean) : [];
  return Array.from(new Set([...current, ...next]));
}

function parseLatLngInput(raw) {
  if (!raw) {
    return null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    try {
      const parsed = JSON.parse(trimmed);
      return parseLatLngInput(parsed);
    } catch {
      const parts = trimmed.split(',').map(part => Number(part.trim()));
      if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        return { lat: parts[0], lng: parts[1] };
      }
    }
  }
  if (Array.isArray(raw)) {
    if (raw.length >= 2) {
      const latCandidate = Number(raw[0]);
      const lngCandidate = Number(raw[1]);
      if (Number.isFinite(latCandidate) && Number.isFinite(lngCandidate)) {
        return { lat: latCandidate, lng: lngCandidate };
      }
      const lngFirst = Number(raw[0]);
      const latSecond = Number(raw[1]);
      if (Number.isFinite(latSecond) && Number.isFinite(lngFirst)) {
        return { lat: latSecond, lng: lngFirst };
      }
    }
    return null;
  }
  if (typeof raw === 'object') {
    const latCandidates = [raw.lat, raw.latitude, raw.y, raw.latLng?.lat];
    const lngCandidates = [raw.lng, raw.longitude, raw.x, raw.latLng?.lng];
    const lat = latCandidates.map(val => Number(val)).find(val => Number.isFinite(val));
    const lng = lngCandidates.map(val => Number(val)).find(val => Number.isFinite(val));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  return null;
}

function parseMapFeatures(raw) {
  const value = typeof raw === 'string' ? (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })() : raw;
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return sanitizeFeatureArray(value);
  }
  if (typeof value === 'object' && value.type === 'FeatureCollection' && Array.isArray(value.features)) {
    return sanitizeFeatureArray(value.features);
  }
  if (typeof value === 'object' && value.type === 'Feature') {
    return sanitizeFeatureArray([value]);
  }
  return [];
}

function sanitizeFeatureArray(features) {
  return features
    .filter(feature => feature && typeof feature === 'object')
    .map(feature => {
      const safeFeature = { ...feature };
      if (safeFeature.properties && typeof safeFeature.properties !== 'object') {
        safeFeature.properties = {};
      }
      if (!safeFeature.properties) {
        safeFeature.properties = {};
      }
      if (!safeFeature.geometry || typeof safeFeature.geometry !== 'object') {
        return null;
      }
      const geometry = { ...safeFeature.geometry };
      if (geometry.coordinates === undefined) {
        return null;
      }
      safeFeature.geometry = geometry;
      return safeFeature;
    })
    .filter(Boolean);
}

function parseMapViewport(raw) {
  const source = typeof raw === 'string' ? (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })() : raw;
  if (!source || typeof source !== 'object') {
    return null;
  }
  const center = parseLatLngInput(source.center || source);
  const zoom = Number(source.zoom);
  const payload = {};
  if (center) {
    payload.center = center;
  }
  if (Number.isFinite(zoom)) {
    payload.zoom = zoom;
  }
  return Object.keys(payload).length ? payload : null;
}

function buildLocationPayload(raw) {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'string') {
    const coords = parseLatLngInput(raw);
    if (coords) {
      return {
        address: '',
        coordinates: coords
      };
    }
    return { address: raw };
  }
  if (typeof raw === 'object') {
    const location = { ...raw };
    const coords = parseLatLngInput(raw.coordinates || raw.coords || raw);
    if (coords) {
      location.coordinates = coords;
    }
    if (!location.address && typeof raw.addressLine === 'string') {
      location.address = raw.addressLine;
    }
    return location;
  }
  return {};
}

function sanitizeChecklistInput(raw) {
  const source = parseJsonField(raw, {});
  if (!source || typeof source !== 'object') {
    return {};
  }
  return Object.entries(source).reduce((acc, [key, value]) => {
    const normalizedKey = cleanString(key);
    if (!normalizedKey) {
      return acc;
    }
    if (value === null || value === undefined) {
      return acc;
    }
    const normalizedValue = typeof value === 'string'
      ? value.trim()
      : typeof value === 'number' && Number.isFinite(value)
        ? value.toString()
        : typeof value === 'boolean'
          ? value.toString()
          : '';
    if (!normalizedValue) {
      return acc;
    }
    acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});
}

function summarizeUser(user) {
  if (!user) {
    return '—';
  }
  if (typeof user === 'string') {
    return user;
  }
  const chunks = [];
  if (user.simpleId != null) {
    chunks.push(`#${user.simpleId}`);
  }
  if (user.name) {
    chunks.push(user.name);
  } else if (user.email) {
    chunks.push(user.email);
  }
  if (user.role) {
    chunks.push(`(${user.role})`);
  }
  return chunks.length ? chunks.join(' ') : '—';
}

function renderPrmscLogo(doc, x, y) {
  doc.save();
  doc.translate(x, y);
  doc.path('M0 0 L120 0 L120 60 L0 60 Z').fill('#FFFFFF');

  // Stylized water drop
  doc.save();
  doc.translate(24, 14);
  doc.fillColor('#0B60B0');
  doc.moveTo(18, 40);
  doc.bezierCurveTo(12, 30, 6, 20, 18, 0);
  doc.bezierCurveTo(30, 20, 24, 30, 18, 40);
  doc.fill();
  doc.restore();

  // Green wave
  doc.save();
  doc.translate(8, 36);
  doc.fillColor('#22A366');
  doc.moveTo(0, 12);
  doc.bezierCurveTo(18, 2, 42, 18, 70, 6);
  doc.bezierCurveTo(48, 28, 18, 24, 0, 12);
  doc.fill();
  doc.restore();

  // Aqua wave
  doc.save();
  doc.translate(6, 44);
  doc.fillColor('#54C4E8');
  doc.moveTo(0, 8);
  doc.bezierCurveTo(18, -4, 46, 16, 76, 2);
  doc.bezierCurveTo(54, 20, 22, 18, 0, 8);
  doc.fill();
  doc.restore();

  doc.fillColor('#0E2F56').fontSize(16).font('Helvetica-Bold').text('PRMSC', 70, 6);
  doc.fontSize(8).font('Helvetica').text('Punjab Rural Municipal Services Company', 70, 26, {
    width: 200
  });
  doc.restore();
  doc.fillColor('#000000');
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function writeKeyValue(doc, key, value, options = {}) {
  const { keyWidth = 140, lineGap = 6 } = options;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0E2F56').text(`${key}:`, {
    continued: true,
    width: keyWidth
  });
  doc.font('Helvetica').fontSize(11).fillColor('#222222').text(value, {
    continued: false
  });
  doc.moveDown(lineGap / 12);
}

// ============================================================================
// Dashboard Statistics Endpoint with Land Area KPIs
// ============================================================================
router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    const { tehsil, district, startDate, endDate } = req.query;
    const filter = {};

    // Apply filters
    if (tehsil) filter.tehsil = tehsil;
    if (district) filter.district = district;
    if (startDate || endDate) {
      filter.dateCreated = {};
      if (startDate) filter.dateCreated[Op.gte] = new Date(startDate);
      if (endDate) filter.dateCreated[Op.lte] = new Date(endDate);
    }

    // Role-based filtering
    if (req.user?.role === 'DM Tehsil' || req.user?.role === 'Tehsil DM') {
      filter.tehsil = req.user.tehsil || filter.tehsil;
    }

    const requisitions = await Requisition.findAll({ where: filter, raw: true });

    // Calculate status counts
    const statusCounts = {};
    requisitions.forEach(r => {
      const status = r.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Pending statuses for "Land Area Requested"
    const pendingStatuses = [
      'Pending', 'Pending DM Review', 'Pending BCC Officer Review',
      'Pending TM Review', 'Pending BCC Specialist Review',
      'Pending WB Dispatch', 'Pending WB Approval', 'Marked to TM',
      'Assigned to BCC', 'Land Acquisition Updated', 'Donor Data Uploaded'
    ].map(s => s.toLowerCase());

    // Approved/Closed statuses for "Land Acquired"
    const completedStatuses = [
      'WB Approved', 'Closed', 'Approved', 'Acquisition Complete'
    ].map(s => s.toLowerCase());

    // Helper to parse land area values (handles strings like "5 Kanals", "10 Marlas")
    function parseLandArea(areaStr) {
      if (!areaStr) return { value: 0, unit: 'sqft' };
      const str = areaStr.toString().toLowerCase().trim();

      // Try to extract numeric value
      const numMatch = str.match(/[\d.]+/);
      const value = numMatch ? parseFloat(numMatch[0]) : 0;

      // Determine unit
      let unit = 'sqft';
      if (str.includes('kanal')) unit = 'kanals';
      else if (str.includes('marla')) unit = 'marlas';
      else if (str.includes('acre')) unit = 'acres';
      else if (str.includes('sqft') || str.includes('sq ft') || str.includes('square feet')) unit = 'sqft';

      return { value, unit };
    }

    // Convert all to sqft for aggregation (1 kanal = 5445 sqft, 1 marla = 272.25 sqft, 1 acre = 43560 sqft)
    function toSqFt(value, unit) {
      switch (unit) {
        case 'kanals': return value * 5445;
        case 'marlas': return value * 272.25;
        case 'acres': return value * 43560;
        default: return value;
      }
    }

    let landAreaRequestedSqFt = 0;
    let landAcquiredSqFt = 0;
    let pendingCount = 0;
    let completedCount = 0;

    requisitions.forEach(r => {
      const status = (r.status || '').toLowerCase();
      const { value, unit } = parseLandArea(r.landArea || r.land_area);
      const sqft = toSqFt(value, unit);

      // Also check calculated area fields
      const calculatedSqFt = Number(r.calculatedAreaSqFt) || Number(r.calculated_area_sq_ft) || 0;
      const effectiveSqFt = calculatedSqFt > 0 ? calculatedSqFt : sqft;

      if (pendingStatuses.some(ps => status.includes(ps) || ps.includes(status))) {
        landAreaRequestedSqFt += effectiveSqFt;
        pendingCount++;
      } else if (completedStatuses.some(cs => status.includes(cs) || cs.includes(status))) {
        landAcquiredSqFt += effectiveSqFt;
        completedCount++;
      }
    });

    // Convert back to kanals for display (more meaningful unit)
    const landAreaRequestedKanals = (landAreaRequestedSqFt / 5445).toFixed(2);
    const landAcquiredKanals = (landAcquiredSqFt / 5445).toFixed(2);

    // Get workflow stage breakdown
    const workflowStages = {
      dmReview: statusCounts['Pending DM Review'] || 0,
      bccOfficerReview: statusCounts['Pending BCC Officer Review'] || 0,
      tmReview: statusCounts['Pending TM Review'] || 0,
      bccSpecialistReview: statusCounts['Pending BCC Specialist Review'] || 0,
      wbPending: (statusCounts['Pending WB Dispatch'] || 0) + (statusCounts['Pending WB Approval'] || 0),
      wbApproved: statusCounts['WB Approved'] || 0,
      closed: statusCounts['Closed'] || 0
    };

    res.json({
      totalRequisitions: requisitions.length,
      statusCounts,
      landAreaKPIs: {
        landAreaRequested: {
          sqFt: Math.round(landAreaRequestedSqFt),
          kanals: parseFloat(landAreaRequestedKanals),
          count: pendingCount,
          label: 'Land Area Requested (Pending)'
        },
        landAcquired: {
          sqFt: Math.round(landAcquiredSqFt),
          kanals: parseFloat(landAcquiredKanals),
          count: completedCount,
          label: 'Land Acquired (Approved/Closed)'
        }
      },
      workflowStages,
      filters: { tehsil, district, startDate, endDate }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ msg: 'Failed to fetch dashboard statistics', error: err.message });
  }
});

// Get all requisitions
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role === 'CID') {
      filter.assignedTo = req.user.userId;
    }
    const requisitions = await Requisition.findAll({ where: filter, include: standardIncludes });
    res.json(serializeMany(requisitions));
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get single requisition by id
router.get('/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const requisition = await Requisition.findByPk(id, { include: standardIncludes });
    if (!requisition) return res.status(404).json({ msg: `Requisition not found for id ${id}` });
    if (req.user?.role === 'CID' && resolveId(requisition.assignedTo) !== resolveId(req.user.userId)) {
      return res.status(403).json({ msg: 'Forbidden: requisition not assigned to this CID officer' });
    }
    res.json(serializeRequisition(requisition));
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Create a new requisition (Engineering Wing Tehsil)
router.post('/', auth, upload.array('attachments', 10), async (req, res) => {
  try {
    const location = buildLocationPayload(req.body.location);
    if (!location.address && typeof req.body.locationAddress === 'string') {
      location.address = req.body.locationAddress;
    }
    if (!location.coordinates) {
      const fallbackCoords = parseLatLngInput(req.body.location) || parseLatLngInput(req.body.mapMarker);
      if (fallbackCoords) {
        location.coordinates = fallbackCoords;
      }
    }

    let mapMarker = parseLatLngInput(req.body.mapMarker);
    if (!mapMarker && location.coordinates) {
      mapMarker = location.coordinates;
    }

    let mapFeatures = parseMapFeatures(req.body.mapFeatures);
    if (mapMarker) {
      const hasMarkerFeature = mapFeatures.some(feature => {
        if (!feature || feature.type !== 'Feature' || !feature.geometry) {
          return false;
        }
        const geometry = feature.geometry;
        if (geometry.type === 'Point' && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
          const [lng, lat] = geometry.coordinates;
          return Number(lat) === Number(mapMarker.lat) && Number(lng) === Number(mapMarker.lng);
        }
        return false;
      });
      if (!hasMarkerFeature) {
        mapFeatures = [
          ...mapFeatures,
          {
            type: 'Feature',
            properties: { kind: 'site-marker' },
            geometry: {
              type: 'Point',
              coordinates: [mapMarker.lng, mapMarker.lat]
            }
          }
        ];
      }
    }

    const parsedViewport = parseMapViewport(req.body.mapViewport);
    const mapViewport = parsedViewport || (mapMarker
      ? {
          center: mapMarker,
          zoom: 13
        }
      : undefined);

    const division = cleanString(req.body.division);
    const district = cleanString(req.body.district);

    // Parse supportingDocs as array if sent as string
    let supportingDocs = req.body.supportingDocs;
    if (typeof supportingDocs === 'string') {
      supportingDocs = supportingDocs ? [supportingDocs] : [];
    }

    // Handle attachments (uploaded files)
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(f => f.filename);
    } else if (req.body.attachments) {
      if (Array.isArray(req.body.attachments)) {
        attachments = req.body.attachments;
      } else if (typeof req.body.attachments === 'string') {
        attachments = [req.body.attachments];
      }
    }

    const landBreadth = Number(req.body.landBreadth) || 0;
    const landDepth = Number(req.body.landDepth) || 0;
    const calculatedAreaSqFt = landBreadth && landDepth ? landBreadth * landDepth : 0;
    const calculatedAreaMarlas = calculatedAreaSqFt ? Number((calculatedAreaSqFt / 272.25).toFixed(2)) : 0;
    const calculatedAreaKanals = calculatedAreaSqFt ? Number((calculatedAreaSqFt / 5445).toFixed(2)) : 0;

    const activityLogEntries = [{
      action: 'Created',
      userId: req.user.userId,
      remarks: 'Requisition created',
      timestamp: new Date()
    }];

    let assignedOfficerId = null;
    let computedStatus = WORKFLOW_STATUSES.PENDING_DM;

    const autoDm = await findFirstUserByRole(['DM Tehsil', 'Tehsil DM']);
    if (autoDm) {
      assignedOfficerId = autoDm.id;
      activityLogEntries.push({
        action: 'Submitted to DM Review',
        userId: req.user.userId,
        remarks: `Auto-assigned to ${summarizeUser(autoDm)} for DM review.`,
        timestamp: new Date()
      });
    } else {
      assignedOfficerId = req.user.userId;
      activityLogEntries.push({
        action: 'Awaiting DM Assignment',
        userId: req.user.userId,
        remarks: 'No DM Tehsil user configured. Assigned back to requester until DM is created.',
        timestamp: new Date()
      });
    }

    const validPriorities = ['Low', 'Medium', 'High'];
    const priorityRaw = typeof req.body.priority === 'string' ? req.body.priority.trim() : '';
    const priorityValue = validPriorities.includes(priorityRaw) ? priorityRaw : 'Medium';

    const landTypeOptions = ['Govt Land', 'Private Land'];
    const rawLandType = typeof req.body.landType === 'string' ? req.body.landType.trim() : '';
    const landTypeValue = landTypeOptions.includes(rawLandType) ? rawLandType : undefined;
    const govtLandChecklist = sanitizeChecklistInput(req.body.govtLandChecklist);
    const privateLandChecklist = sanitizeChecklistInput(req.body.privateLandChecklist);

    const reqData = {
      title: req.body.title,
      description: req.body.description,
      purpose: req.body.purpose,
      division,
      district,
      requestedBy: req.user.userId,
      assignedTo: assignedOfficerId || undefined,
      tehsil: req.body.tehsil,
      landArea: req.body.landArea,
      landType: landTypeValue,
      govtLandChecklist: Object.keys(govtLandChecklist).length ? govtLandChecklist : undefined,
      privateLandChecklist: Object.keys(privateLandChecklist).length ? privateLandChecklist : undefined,
      landBreadth,
      landDepth,
      calculatedAreaSqFt,
      calculatedAreaMarlas,
      calculatedAreaKanals,
      locationAddress: location.address || '',
      locationLat: location.coordinates?.lat || null,
      locationLng: location.coordinates?.lng || null,
      mapMarkerLat: mapMarker?.lat || null,
      mapMarkerLng: mapMarker?.lng || null,
      mapViewportCenterLat: mapViewport?.center?.lat || null,
      mapViewportCenterLng: mapViewport?.center?.lng || null,
      mapViewportZoom: mapViewport?.zoom || 0,
      mapFeatures,
      landAcquisitionType: landTypeValue || undefined,
      requiredDate: req.body.requiredDate,
      priority: priorityValue,
      supportingDocs,
      estimatedValue: req.body.estimatedValue,
      remarks: req.body.remarks,
      attachments,
      status: computedStatus,
      lastUpdated: new Date()
    };

    const requisition = await Requisition.create(reqData);

    // Create activity log entries
    for (const entry of activityLogEntries) {
      await RequisitionActivityLog.create({ requisitionId: requisition.id, ...entry });
    }

    const full = await reloadRequisition(requisition.id);
    res.status(201).json(serializeRequisition(full));
  } catch (err) {
    console.error('Requisition POST error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

router.patch(
  '/:id/map',
  auth,
  requireRole(
    'DM Tehsil',
    'Tehsil DM',
    'Infra Engineer',
    'Infra Head',
    'CID',
    'CID Officer',
    'BCC Specialist',
    'BCC Officer Tehsil',
    'BCC Officer',
    'Super Admin'
  ),
  async (req, res) => {
    try {
      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const mapFeaturesInput = parseMapFeatures(req.body.mapFeatures);
      const viewport = parseMapViewport(req.body.mapViewport);
      let mapMarker = parseLatLngInput(req.body.mapMarker);

      const existingLocation = {
        address: requisition.locationAddress || '',
        coordinates: (requisition.locationLat != null && requisition.locationLng != null)
          ? { lat: Number(requisition.locationLat), lng: Number(requisition.locationLng) }
          : null
      };
      const locationUpdate = buildLocationPayload(req.body.location);
      const locationAddressRaw = req.body.locationAddress !== undefined ? cleanString(req.body.locationAddress) : undefined;

      const updatedLocation = { ...existingLocation, ...locationUpdate };
      if (locationAddressRaw !== undefined) {
        updatedLocation.address = locationAddressRaw;
      }

      if (!mapMarker && updatedLocation.coordinates) {
        mapMarker = updatedLocation.coordinates;
      }
      if (mapMarker) {
        updatedLocation.coordinates = mapMarker;
      }

      let sanitizedFeatures = mapFeaturesInput;
      if (mapMarker) {
        let hasMarkerFeature = false;
        sanitizedFeatures = mapFeaturesInput.filter(feature => {
          if (!feature || feature.type !== 'Feature' || !feature.geometry) {
            return false;
          }
          if (feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
            const [lng, lat] = feature.geometry.coordinates;
            if (Number(lat) === Number(mapMarker.lat) && Number(lng) === Number(mapMarker.lng)) {
              hasMarkerFeature = true;
            }
          }
          return true;
        });
        if (!hasMarkerFeature) {
          sanitizedFeatures = [
            ...sanitizedFeatures,
            {
              type: 'Feature',
              properties: { kind: 'site-marker' },
              geometry: {
                type: 'Point',
                coordinates: [mapMarker.lng, mapMarker.lat]
              }
            }
          ];
        }
      } else {
        sanitizedFeatures = mapFeaturesInput.filter(feature => {
          if (!feature || feature.type !== 'Feature') {
            return false;
          }
          const kind = feature?.properties?.kind;
          return kind !== 'site-marker';
        });
      }

      requisition.locationAddress = updatedLocation.address || '';
      requisition.locationLat = updatedLocation.coordinates?.lat || null;
      requisition.locationLng = updatedLocation.coordinates?.lng || null;
      requisition.mapMarkerLat = mapMarker?.lat || null;
      requisition.mapMarkerLng = mapMarker?.lng || null;
      requisition.mapFeatures = sanitizedFeatures;
      if (viewport) {
        requisition.mapViewportCenterLat = viewport.center?.lat || null;
        requisition.mapViewportCenterLng = viewport.center?.lng || null;
        requisition.mapViewportZoom = viewport.zoom || 0;
      }

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Map Updated',
        userId: req.user.userId,
        timestamp: new Date(),
        remarks: sanitizedFeatures.length
          ? `${sanitizedFeatures.length} map feature${sanitizedFeatures.length === 1 ? '' : 's'} captured`
          : mapMarker
          ? 'Pushpin updated'
          : 'Map cleared'
      });
      requisition.lastUpdated = new Date();

      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.mapUpdate] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
    }
  }
);

// BCC Officer uploads donor data
router.patch('/:id/donor', auth, async (req, res) => {
  try {
    const { donorData } = req.body;
    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) return res.status(404).json({ msg: 'Not found' });
    requisition.status = 'Donor Data Uploaded';
    // Store donorData in landAcquisitionData
    const existing = requisition.landAcquisitionData || {};
    requisition.landAcquisitionData = { ...existing, donorData };
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Donor Data Uploaded',
      userId: req.user.userId,
      timestamp: new Date()
    });
    requisition.lastUpdated = new Date();
    await requisition.save();
    const full = await reloadRequisition(requisition.id);
    res.json(serializeRequisition(full));
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// BCC Officer adds documentation
router.patch('/:id/docs', auth, async (req, res) => {
  try {
    const { documents } = req.body;
    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) return res.status(404).json({ msg: 'Not found' });
    requisition.status = 'Documentation Added';
    const existing = requisition.landAcquisitionData || {};
    const donorData = existing.donorData;
    if (donorData && Array.isArray(donorData) && donorData.length > 0) {
      donorData[0].documents = documents;
      requisition.landAcquisitionData = { ...existing, donorData };
    }
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Documentation Added',
      userId: req.user.userId,
      timestamp: new Date()
    });
    requisition.lastUpdated = new Date();
    await requisition.save();
    const full = await reloadRequisition(requisition.id);
    res.json(serializeRequisition(full));
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.patch(
  '/:id/land-acquisition',
  auth,
  requireRole('BCC Officer Tehsil', 'BCC Officer', 'BCC Specialist', 'Super Admin'),
  upload.fields([
    { name: 'ownershipProof', maxCount: 1 },
    { name: 'attachedDocuments', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const existingData = requisition.landAcquisitionData || {};
      const existingType = requisition.landAcquisitionType || '';
      const existingStatus = requisition.landAcquisitionStatus || '';
      const typeRaw = cleanString(req.body.type) || existingType || requisition.landType || 'Private Land';
      const type = typeRaw === 'Govt Land' ? 'Govt Land' : 'Private Land';
      const statusRaw = cleanString(req.body.status);
      if (statusRaw && !LAND_ACQUISITION_STATUS_SET.has(statusRaw.toLowerCase())) {
        return res.status(400).json({ msg: `Invalid land acquisition status: ${statusRaw}` });
      }

      const donorDetails = parseJsonField(req.body.donorDetails, {});
      const landDetails = parseJsonField(req.body.landDetails, {});
      const donationDetails = parseJsonField(req.body.donationDetails, {});
      const verificationDetails = parseJsonField(req.body.verification, {});
      const keepAttachments = parseJsonField(req.body.keepAttachments, []);

      const willingnessRaw = cleanString(donationDetails.willingnessDate);
      const verifiedDateRaw = cleanString(verificationDetails.verifiedDate);

      const donor = {
        ...(existingData.donor || {}),
        fullName: cleanString(donorDetails.fullName || donorDetails.name || (existingData.donor || {}).fullName || ''),
        cnic: cleanString(donorDetails.cnic || donorDetails.cnicNumber || (existingData.donor || {}).cnic || ''),
        contactNumber: cleanString(donorDetails.contactNumber || donorDetails.phone || (existingData.donor || {}).contactNumber || ''),
        address: cleanString(donorDetails.address || (existingData.donor || {}).address || ''),
        villageName: cleanString(donorDetails.villageName || donorDetails.village || (existingData.donor || {}).villageName || ''),
        tehsil: cleanString(donorDetails.tehsil || (existingData.donor || {}).tehsil || ''),
        district: cleanString(donorDetails.district || (existingData.donor || {}).district || '')
      };

      const land = {
        ...(existingData.land || {}),
        khasraNumber: cleanString(landDetails.khasraNumber || (existingData.land || {}).khasraNumber || ''),
        area: cleanString(landDetails.area || (existingData.land || {}).area || ''),
        landCategory: cleanString(landDetails.landCategory || landDetails.landType || (existingData.land || {}).landCategory || ''),
        latitude: toNumber(landDetails.latitude) ?? (existingData.land || {}).latitude ?? null,
        longitude: toNumber(landDetails.longitude) ?? (existingData.land || {}).longitude ?? null,
        mutationNumber: cleanString(landDetails.mutationNumber || (existingData.land || {}).mutationNumber || ''),
        currentUse: cleanString(landDetails.currentUse || (existingData.land || {}).currentUse || '')
      };

      const donation = {
        ...(existingData.donation || {}),
        donationType: cleanString(donationDetails.donationType || (existingData.donation || {}).donationType || ''),
        purpose: cleanString(donationDetails.purpose || (existingData.donation || {}).purpose || ''),
        willingnessDate: willingnessRaw
          ? new Date(willingnessRaw)
          : (existingData.donation || {}).willingnessDate || null,
        remarks: cleanString(donationDetails.remarks || (existingData.donation || {}).remarks || ''),
        attachedDocuments: []
      };

      const verification = {
        ...(existingData.verification || {}),
        verifiedBy: cleanString(verificationDetails.verifiedBy || (existingData.verification || {}).verifiedBy || ''),
        verifiedDate: verifiedDateRaw
          ? new Date(verifiedDateRaw)
          : (existingData.verification || {}).verifiedDate || null,
        approvedBy: cleanString(verificationDetails.approvedBy || (existingData.verification || {}).approvedBy || ''),
        approvalStatus: cleanString(verificationDetails.approvalStatus || (existingData.verification || {}).approvalStatus || '')
      };

      const keepList = Array.isArray(keepAttachments)
        ? keepAttachments.map(item => cleanString(item)).filter(Boolean)
        : [];
      const newAttachmentFiles = (req.files?.attachedDocuments || []).map(file => file.filename);
      donation.attachedDocuments = [...keepList, ...newAttachmentFiles];

      const ownershipFiles = req.files?.ownershipProof || [];
      if (ownershipFiles.length) {
        const newFile = ownershipFiles[0].filename;
        const previousFile = (existingData.land || {}).ownershipProof;
        land.ownershipProof = newFile;
        if (previousFile && previousFile !== newFile) {
          const previousPath = path.join(__dirname, '../uploads', previousFile);
          fs.unlink(previousPath, () => {});
        }
      } else if ((existingData.land || {}).ownershipProof) {
        land.ownershipProof = (existingData.land || {}).ownershipProof;
      }

      const acqStatus = statusRaw || existingStatus || 'Identification Pending';
      requisition.landAcquisitionType = type;
      requisition.landAcquisitionStatus = acqStatus;
      requisition.landAcquisitionData = { donor, land, donation, verification };
      requisition.landAcquisitionUpdatedBy = req.user.userId;
      requisition.landAcquisitionUpdatedAt = new Date();

      const nextStageLabel = cleanString(acqStatus);
      const normalizedNextStage = normalizeStatus(nextStageLabel);
      const normalizedCurrentStatus = normalizeStatus(requisition.status);
      const stageIsSyncable = normalizedNextStage && BCC_LAND_STATUS_SET.has(normalizedNextStage);
      const currentlyInBccFlow = !normalizedCurrentStatus || BCC_LAND_STATUS_SET.has(normalizedCurrentStatus);
      if (stageIsSyncable && currentlyInBccFlow) {
        requisition.status = nextStageLabel;
      }

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Land Acquisition Updated',
        userId: req.user.userId,
        timestamp: new Date(),
        remarks: `Stage set to ${acqStatus}`
      });
      requisition.lastUpdated = new Date();
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.land-acquisition] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
    }
  }
);

router.patch(
  '/:id/land-utilization/overview',
  auth,
  requireRole('DM Tehsil', 'Tehsil DM', 'Super Admin'),
  async (req, res) => {
    try {
      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const now = new Date();
      requisition.landUtilizationPhase = cleanString(req.body.phase);
      requisition.landUtilizationSummary = cleanString(req.body.summary);
      requisition.landUtilizationNextMilestone = cleanString(req.body.nextMilestone);
      requisition.landUtilizationUpdatedBy = req.user.userId;
      requisition.landUtilizationUpdatedAt = now;

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Land Utilization Overview Updated',
        userId: req.user.userId,
        timestamp: now,
        remarks: requisition.landUtilizationPhase || 'Phase updated'
      });
      requisition.lastUpdated = now;
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.land-utilization.overview] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
    }
  }
);

router.post(
  '/:id/land-utilization/civil-structures',
  auth,
  requireRole('DM Tehsil', 'Tehsil DM', 'Super Admin'),
  upload.array('photos', 10),
  async (req, res) => {
    try {
      const name = cleanString(req.body.name);
      if (!name) {
        return res.status(400).json({ msg: 'Structure name is required.' });
      }

      let attributes;
      if (req.body.attributes) {
        try {
          attributes = JSON.parse(req.body.attributes);
        } catch (err) {
          return res.status(400).json({ msg: 'Structure attributes must be valid JSON.' });
        }
      }

      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const now = new Date();
      const photos = Array.isArray(req.files) ? req.files.map(file => file.filename) : [];

      await RequisitionCivilStructure.create({
        requisitionId: requisition.id,
        name,
        category: cleanString(req.body.category),
        status: cleanString(req.body.status) || 'Planned',
        description: cleanString(req.body.description),
        attributes: attributes && Object.keys(attributes).length ? attributes : undefined,
        photos,
        updatedBy: req.user.userId
      });

      // Merge photos into gallery
      requisition.landUtilizationGallery = mergeGallery(requisition.landUtilizationGallery, photos);
      requisition.landUtilizationUpdatedBy = req.user.userId;
      requisition.landUtilizationUpdatedAt = now;

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Civil Structure Added',
        userId: req.user.userId,
        timestamp: now,
        remarks: name
      });
      requisition.lastUpdated = now;
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.status(201).json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.land-utilization.civil-structures] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
    }
  }
);

router.post(
  '/:id/land-utilization/machinery',
  auth,
  requireRole('DM Tehsil', 'Tehsil DM', 'Super Admin'),
  upload.array('photos', 10),
  async (req, res) => {
    try {
      const name = cleanString(req.body.name);
      if (!name) {
        return res.status(400).json({ msg: 'Machinery name is required.' });
      }

      let attributes;
      if (req.body.attributes) {
        try {
          attributes = JSON.parse(req.body.attributes);
        } catch (err) {
          return res.status(400).json({ msg: 'Machinery attributes must be valid JSON.' });
        }
      }

      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const now = new Date();
      const photos = Array.isArray(req.files) ? req.files.map(file => file.filename) : [];

      await RequisitionMachinery.create({
        requisitionId: requisition.id,
        name,
        type: cleanString(req.body.type),
        status: cleanString(req.body.status) || 'Idle',
        capacity: cleanString(req.body.capacity),
        manufacturer: cleanString(req.body.manufacturer),
        attributes: attributes && Object.keys(attributes).length ? attributes : undefined,
        photos,
        updatedBy: req.user.userId
      });

      // Merge photos into gallery
      requisition.landUtilizationGallery = mergeGallery(requisition.landUtilizationGallery, photos);
      requisition.landUtilizationUpdatedBy = req.user.userId;
      requisition.landUtilizationUpdatedAt = now;

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Machinery Added',
        userId: req.user.userId,
        timestamp: now,
        remarks: name
      });
      requisition.lastUpdated = now;
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.status(201).json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.land-utilization.machinery] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
    }
  }
);

router.post(
  '/:id/land-utilization/progress',
  auth,
  requireRole('DM Tehsil', 'Tehsil DM', 'Super Admin'),
  upload.array('photos', 10),
  async (req, res) => {
    try {
      const statusText = cleanString(req.body.status);
      if (!statusText) {
        return res.status(400).json({ msg: 'Progress status is required.' });
      }

      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const now = new Date();
      const attachments = Array.isArray(req.files) ? req.files.map(file => file.filename) : [];
      const progressDateRaw = cleanString(req.body.progressDate);
      const completionRaw = cleanString(req.body.completionPercentage);
      const completion = completionRaw ? Number(completionRaw) : undefined;
      if (completion !== undefined && !Number.isFinite(completion)) {
        return res.status(400).json({ msg: 'Completion percentage must be numeric.' });
      }
      if (completion !== undefined && (completion < 0 || completion > 100)) {
        return res.status(400).json({ msg: 'Completion percentage must be between 0 and 100.' });
      }

      await RequisitionProgressUpdate.create({
        requisitionId: requisition.id,
        status: statusText,
        description: cleanString(req.body.description),
        progressDate: progressDateRaw ? new Date(progressDateRaw) : now,
        completionPercentage: completion !== undefined ? completion : undefined,
        attachments,
        updatedBy: req.user.userId
      });

      // Merge attachments into gallery
      requisition.landUtilizationGallery = mergeGallery(requisition.landUtilizationGallery, attachments);
      requisition.landUtilizationUpdatedBy = req.user.userId;
      requisition.landUtilizationUpdatedAt = now;

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Progress Update Logged',
        userId: req.user.userId,
        timestamp: now,
        remarks: statusText
      });
      requisition.lastUpdated = now;
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.status(201).json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.land-utilization.progress] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
    }
  }
);

// ============================================================================
// Due Diligence Form PDF Download
// ============================================================================
router.get('/:id/due-diligence-pdf', auth, async (req, res) => {
  try {
    const requisition = await Requisition.findByPk(req.params.id, { include: standardIncludes });
    if (!requisition) {
      return res.status(404).json({ msg: 'Requisition not found.' });
    }

    const serialized = serializeRequisition(requisition);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filenameBase = serialized.sequenceNumber != null
      ? `due-diligence-${serialized.sequenceNumber}`
      : `due-diligence-${serialized.id}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filenameBase}.pdf`);

    doc.pipe(res);

    // Header
    renderPrmscLogo(doc, 40, 30);
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0E2F56').text('Due Diligence Form', 0, 40, { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#333333').text('Land Requisition Assessment', 0, 60, { align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor('#666666').text(`Generated on ${formatDateTime(new Date())}`, { align: 'right' });

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#0E2F56').lineWidth(2).stroke();
    doc.moveDown(0.8);

    // Section 1: Basic Information
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0E2F56').text('Section 1: Basic Information');
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
    doc.moveDown(0.4);

    writeKeyValue(doc, 'Reference Number', serialized.sequenceNumber != null ? `REQ-${serialized.sequenceNumber}` : serialized.id.toString());
    writeKeyValue(doc, 'Title', serialized.title || '—');
    writeKeyValue(doc, 'Purpose', serialized.purpose || '—');
    writeKeyValue(doc, 'Status', serialized.status || '—');
    writeKeyValue(doc, 'Priority', serialized.priority || '—');
    writeKeyValue(doc, 'Requested By', summarizeUser(serialized.requestedBy));
    writeKeyValue(doc, 'Assigned To', summarizeUser(serialized.assignedTo));
    writeKeyValue(doc, 'Date Created', formatDateTime(serialized.dateCreated));
    writeKeyValue(doc, 'Required By', formatDateTime(serialized.requiredDate));

    // Section 2: Location Details
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0E2F56').text('Section 2: Location Details');
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
    doc.moveDown(0.4);

    writeKeyValue(doc, 'Division', serialized.division || '—');
    writeKeyValue(doc, 'District', serialized.district || '—');
    writeKeyValue(doc, 'Tehsil', serialized.tehsil || '—');
    writeKeyValue(doc, 'Address', serialized.location?.address || '—');
    if (serialized.location?.coordinates?.lat && serialized.location?.coordinates?.lng) {
      writeKeyValue(doc, 'Coordinates', `${serialized.location.coordinates.lat.toFixed(6)}, ${serialized.location.coordinates.lng.toFixed(6)}`);
    }

    // Section 3: Land Details
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0E2F56').text('Section 3: Land Details');
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
    doc.moveDown(0.4);

    writeKeyValue(doc, 'Land Type', serialized.landType || '—');
    writeKeyValue(doc, 'Land Area', serialized.landArea || '—');
    const calcSqFt = Number(serialized.calculatedAreaSqFt);
    const calcMarlas = Number(serialized.calculatedAreaMarlas);
    const calcKanals = Number(serialized.calculatedAreaKanals);
    writeKeyValue(doc, 'Calculated Area (Sq Ft)', calcSqFt ? calcSqFt.toLocaleString() : '—');
    writeKeyValue(doc, 'Calculated Area (Marlas)', calcMarlas ? calcMarlas.toFixed(2) : '—');
    writeKeyValue(doc, 'Calculated Area (Kanals)', calcKanals ? calcKanals.toFixed(2) : '—');
    writeKeyValue(doc, 'Land Dimensions', serialized.landBreadth && serialized.landDepth ? `${serialized.landBreadth} x ${serialized.landDepth} ft` : '—');

    // Section 4: Land Acquisition Information
    const landAcq = serialized.landAcquisition || {};
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0E2F56').text('Section 4: Land Acquisition Information');
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
    doc.moveDown(0.4);

    writeKeyValue(doc, 'Acquisition Type', landAcq.type || '—');
    writeKeyValue(doc, 'Acquisition Status', landAcq.status || '—');

    // Donor Information
    if (landAcq.donor) {
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#333333').text('Donor Information:');
      doc.moveDown(0.2);
      writeKeyValue(doc, 'Full Name', landAcq.donor.fullName || '—');
      writeKeyValue(doc, 'CNIC', landAcq.donor.cnic || '—');
      writeKeyValue(doc, 'Contact Number', landAcq.donor.contactNumber || '—');
      writeKeyValue(doc, 'Address', landAcq.donor.address || '—');
      writeKeyValue(doc, 'Village', landAcq.donor.villageName || '—');
      writeKeyValue(doc, 'Tehsil', landAcq.donor.tehsil || '—');
      writeKeyValue(doc, 'District', landAcq.donor.district || '—');
    }

    // Land Registration Details
    if (landAcq.land) {
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#333333').text('Land Registration Details:');
      doc.moveDown(0.2);
      writeKeyValue(doc, 'Khasra Number', landAcq.land.khasraNumber || '—');
      writeKeyValue(doc, 'Land Category', landAcq.land.landCategory || '—');
      writeKeyValue(doc, 'Area', landAcq.land.area || '—');
      writeKeyValue(doc, 'Current Use', landAcq.land.currentUse || '—');
      writeKeyValue(doc, 'Ownership Proof', landAcq.land.ownershipProof || '—');
      writeKeyValue(doc, 'Mutation Number', landAcq.land.mutationNumber || '—');
      if (landAcq.land.latitude && landAcq.land.longitude) {
        writeKeyValue(doc, 'Land Coordinates', `${Number(landAcq.land.latitude).toFixed(6)}, ${Number(landAcq.land.longitude).toFixed(6)}`);
      }
    }

    // Donation Details
    if (landAcq.donation) {
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#333333').text('Donation Details:');
      doc.moveDown(0.2);
      writeKeyValue(doc, 'Donation Type', landAcq.donation.donationType || '—');
      writeKeyValue(doc, 'Purpose', landAcq.donation.purpose || '—');
      writeKeyValue(doc, 'Willingness Date', formatDateTime(landAcq.donation.willingnessDate));
      writeKeyValue(doc, 'Remarks', landAcq.donation.remarks || '—');
    }

    // Verification
    if (landAcq.verification) {
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#333333').text('Verification Status:');
      doc.moveDown(0.2);
      writeKeyValue(doc, 'Verified By', landAcq.verification.verifiedBy || '—');
      writeKeyValue(doc, 'Verification Date', formatDateTime(landAcq.verification.verifiedDate));
      writeKeyValue(doc, 'Approved By', landAcq.verification.approvedBy || '—');
      writeKeyValue(doc, 'Approval Status', landAcq.verification.approvalStatus || '—');
    }

    // Section 5: Checklist Status
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0E2F56').text('Section 5: Due Diligence Checklist');
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
    doc.moveDown(0.4);

    const checklist = serialized.landType === 'Private Land' ? serialized.privateLandChecklist : serialized.govtLandChecklist;
    if (checklist && typeof checklist === 'object' && Object.keys(checklist).length > 0) {
      Object.entries(checklist).forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const status = value ? '✓ Completed' : '○ Pending';
        const color = value ? '#27ae60' : '#e74c3c';
        doc.font('Helvetica').fontSize(11).fillColor(color).text(`${status}  ${label}`);
        doc.moveDown(0.2);
      });
    } else {
      doc.font('Helvetica').fontSize(11).fillColor('#666666').text('No checklist items recorded.');
    }

    // Section 6: Activity History
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0E2F56').text('Section 6: Workflow Activity History');
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#4A90A4').lineWidth(1).stroke();
    doc.moveDown(0.4);

    const activityLog = serialized.activityLog || [];
    if (!activityLog.length) {
      doc.font('Helvetica').fontSize(11).fillColor('#666666').text('No activity recorded yet.');
    } else {
      const sortedLogs = [...activityLog].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
      sortedLogs.slice(-15).forEach(entry => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0E2F56').text(`${formatDateTime(entry.timestamp)} — ${entry.action || 'Activity'}`);
        doc.font('Helvetica').fontSize(10).fillColor('#444444').text(`   By: ${summarizeUser(entry.user)}`);
        if (entry.remarks) {
          doc.font('Helvetica-Oblique').fontSize(9).fillColor('#666666').text(`   "${entry.remarks}"`, { indent: 16 });
        }
        doc.moveDown(0.3);
      });
    }

    // Footer
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9).fillColor('#888888').text(
      'This Due Diligence Form represents the state of the requisition at the time of generation. For official purposes, please verify with the system of record.',
      { align: 'center' }
    );

    // Signature blocks
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text('Prepared By:', 50);
    doc.moveDown(0.8);
    doc.text('_________________________', 50);
    doc.font('Helvetica').fontSize(9).text('Name & Designation', 50);

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text('Verified By:', 300, doc.y - 36);
    doc.moveDown(0.8);
    doc.text('_________________________', 300, doc.y - 24);
    doc.font('Helvetica').fontSize(9).text('Name & Designation', 300);

    doc.end();
  } catch (err) {
    console.error('[requisition.due-diligence-pdf] error:', err);
    if (!res.headersSent) {
      res.status(500).json({ msg: 'Unable to generate Due Diligence PDF.', error: err.message });
    }
  }
});

router.patch(
  '/:id/utilization/overview',
  auth,
  requireRole('DM Tehsil', 'Super Admin'),
  async (req, res) => {
    try {
      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      requisition.landUtilizationPhase = cleanString(req.body.phase) || requisition.landUtilizationPhase || '';
      requisition.landUtilizationSummary = cleanString(req.body.summary) || requisition.landUtilizationSummary || '';
      requisition.landUtilizationNextMilestone = cleanString(req.body.nextMilestone) || requisition.landUtilizationNextMilestone || '';
      requisition.landUtilizationUpdatedBy = req.user.userId;
      requisition.landUtilizationUpdatedAt = new Date();

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Land Utilization Overview Updated',
        userId: req.user.userId,
        timestamp: new Date(),
        remarks: requisition.landUtilizationPhase ? `Phase set to ${requisition.landUtilizationPhase}` : 'Overview updated'
      });
      requisition.lastUpdated = new Date();
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.land-utilization.overview] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
);

// Download requisition PDF summary
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const requisition = await Requisition.findByPk(req.params.id, { include: standardIncludes });
    if (!requisition) {
      return res.status(404).json({ msg: 'Requisition not found.' });
    }

    const serialized = serializeRequisition(requisition);

    const doc = new PDFDocument({ margin: 50 });
    const filenameBase = serialized.sequenceNumber != null
      ? `requisition-${serialized.sequenceNumber}`
      : `requisition-${serialized.id}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filenameBase}.pdf`);

    doc.pipe(res);

    renderPrmscLogo(doc, 40, 30);
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#0E2F56').text('Requisition Workflow Report', 0, 40, {
      align: 'right'
    });
    doc.font('Helvetica').fontSize(10).fillColor('#333333').text(`Generated on ${formatDateTime(new Date())}`, {
      align: 'right'
    });

    doc.moveDown(1.2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#0E2F56').lineWidth(1).stroke();
    doc.moveDown(0.8);

    writeKeyValue(doc, 'Reference', serialized.sequenceNumber != null ? `#${serialized.sequenceNumber}` : serialized.id.toString());
    writeKeyValue(doc, 'Title', serialized.title || '—');
    writeKeyValue(doc, 'Status', serialized.status || '—');
    writeKeyValue(doc, 'Priority', serialized.priority || '—');
    writeKeyValue(doc, 'Requested By', summarizeUser(serialized.requestedBy));
    writeKeyValue(doc, 'Assigned To', summarizeUser(serialized.assignedTo));
    writeKeyValue(doc, 'Created On', formatDateTime(serialized.dateCreated));
    writeKeyValue(doc, 'Last Updated', formatDateTime(serialized.lastUpdated));

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0E2F56').text('Key Details');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11).fillColor('#222222');
    const summaryLines = [
      `Purpose: ${serialized.purpose || '—'}`,
      `Division / District / Tehsil: ${[serialized.division, serialized.district, serialized.tehsil]
        .filter(Boolean)
        .join(' · ') || '—'}`,
      `Land Type: ${serialized.landType || '—'} | Area: ${serialized.landArea || '—'}`,
      `Required Date: ${formatDateTime(serialized.requiredDate)}`
    ];
    summaryLines.forEach(line => {
      doc.text(line);
    });

    if (serialized.location) {
      const address = serialized.location.address ? `Address: ${serialized.location.address}` : null;
      const coords = serialized.location.coordinates && Number.isFinite(serialized.location.coordinates.lat)
        && Number.isFinite(serialized.location.coordinates.lng)
        ? `Coordinates: ${serialized.location.coordinates.lat.toFixed(6)}, ${serialized.location.coordinates.lng.toFixed(6)}`
        : null;
      if (address || coords) {
        doc.text(address || '');
        if (coords) {
          doc.text(coords);
        }
      }
    }

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0E2F56').text('Activity Trail');
    doc.moveDown(0.3);
    const pdfActivityLog = serialized.activityLog || [];
    if (!pdfActivityLog.length) {
      doc.font('Helvetica').fontSize(11).fillColor('#444444').text('No activity recorded yet.');
    } else {
      [...pdfActivityLog]
        .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0))
        .forEach(entry => {
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#0E2F56').text(`${formatDateTime(entry.timestamp)} · ${entry.action || 'Activity'}`);
          doc.font('Helvetica').fontSize(11).fillColor('#222222').text(`By ${summarizeUser(entry.user)}`);
          if (entry.remarks) {
            doc.font('Helvetica-Oblique').fontSize(10).fillColor('#555555').text(entry.remarks, {
              indent: 16
            });
          }
          if (entry.meta && entry.meta.toStatus) {
            doc.font('Helvetica').fontSize(10).fillColor('#666666').text(`Next Stage: ${entry.meta.toStatus}`, {
              indent: 16
            });
          }
          doc.moveDown(0.4);
        });
    }

    const pdfLandAcq = serialized.landAcquisition || {};
    if (pdfLandAcq.type || pdfLandAcq.status) {
      doc.moveDown(0.6);
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0E2F56').text('Land Acquisition Snapshot');
      doc.moveDown(0.3);
      writeKeyValue(doc, 'Stage', pdfLandAcq.status || '—');
      writeKeyValue(doc, 'Donor', pdfLandAcq.donor?.fullName ? `${pdfLandAcq.donor.fullName}${pdfLandAcq.donor.contactNumber ? ` · ${pdfLandAcq.donor.contactNumber}` : ''}` : '—');
      writeKeyValue(doc, 'Land Reference', pdfLandAcq.land?.khasraNumber || '—');
      writeKeyValue(doc, 'Updated By', summarizeUser(pdfLandAcq.updatedBy));
      writeKeyValue(doc, 'Updated On', formatDateTime(pdfLandAcq.updatedAt));
    }

    doc.moveDown(1.2);
    doc.font('Helvetica').fontSize(9).fillColor('#777777').text('This report captures the requisition state at the time of download. Workflow changes after this point will require a fresh export.', {
      align: 'center'
    });

    doc.end();
  } catch (err) {
    console.error('[requisition.pdf] error:', err);
    if (!res.headersSent) {
      res.status(500).json({ msg: 'Unable to prepare requisition PDF.', error: err.message });
    }
  }
});

router.post(
  '/:id/utilization/structures',
  auth,
  requireRole('DM Tehsil', 'Super Admin'),
  upload.array('photos', 10),
  async (req, res) => {
    try {
      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const name = cleanString(req.body.name);
      if (!name) {
        return res.status(400).json({ msg: 'Structure name is required.' });
      }

      const attributes = parseJsonField(req.body.attributes, {});
      const photos = (req.files || []).map(file => file.filename);

      await RequisitionCivilStructure.create({
        requisitionId: requisition.id,
        name,
        category: cleanString(req.body.category),
        status: cleanString(req.body.status) || 'Planned',
        description: cleanString(req.body.description),
        attributes,
        photos,
        updatedBy: req.user.userId
      });

      requisition.landUtilizationGallery = Array.from(new Set([...(requisition.landUtilizationGallery || []), ...photos]));
      requisition.landUtilizationUpdatedBy = req.user.userId;
      requisition.landUtilizationUpdatedAt = new Date();

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Civil Structure Added',
        userId: req.user.userId,
        timestamp: new Date(),
        remarks: name
      });
      requisition.lastUpdated = new Date();
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.status(201).json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.land-utilization.addStructure] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
);

router.patch(
  '/:id/utilization/structures/:structureId',
  auth,
  requireRole('DM Tehsil', 'Super Admin'),
  upload.array('photos', 10),
  async (req, res) => {
    try {
      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const structure = await RequisitionCivilStructure.findOne({
        where: { id: req.params.structureId, requisitionId: requisition.id }
      });
      if (!structure) {
        return res.status(404).json({ msg: 'Structure not found' });
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
        const updatedName = cleanString(req.body.name);
        if (!updatedName) {
          return res.status(400).json({ msg: 'Structure name cannot be empty.' });
        }
        structure.name = updatedName;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'category')) {
        structure.category = cleanString(req.body.category);
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
        structure.status = cleanString(req.body.status) || structure.status;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
        structure.description = cleanString(req.body.description);
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'attributes')) {
        structure.attributes = parseJsonField(req.body.attributes, structure.attributes || {});
      }

      const keepPhotos = parseJsonField(req.body.keepPhotos, []);
      const keepSet = new Set(Array.isArray(keepPhotos) ? keepPhotos : []);
      const existingPhotos = Array.isArray(structure.photos) ? structure.photos : [];
      const retained = existingPhotos.filter(photo => keepSet.has(photo));
      const removed = existingPhotos.filter(photo => !keepSet.has(photo));
      const newPhotos = (req.files || []).map(file => file.filename);
      structure.photos = [...retained, ...newPhotos];
      deleteFilesQuietly(removed);

      // Update gallery on requisition
      const currentGallery = Array.isArray(requisition.landUtilizationGallery) ? requisition.landUtilizationGallery : [];
      requisition.landUtilizationGallery = Array.from(new Set([...currentGallery.filter(photo => !removed.includes(photo)), ...newPhotos]));

      structure.updatedBy = req.user.userId;
      await structure.save();

      requisition.landUtilizationUpdatedBy = req.user.userId;
      requisition.landUtilizationUpdatedAt = new Date();

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Civil Structure Updated',
        userId: req.user.userId,
        timestamp: new Date(),
        remarks: structure.name
      });
      requisition.lastUpdated = new Date();
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.land-utilization.updateStructure] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
);

router.post(
  '/:id/utilization/machinery',
  auth,
  requireRole('DM Tehsil', 'Super Admin'),
  upload.array('photos', 10),
  async (req, res) => {
    try {
      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const name = cleanString(req.body.name);
      if (!name) {
        return res.status(400).json({ msg: 'Machinery name is required.' });
      }

      const attributes = parseJsonField(req.body.attributes, {});
      const photos = (req.files || []).map(file => file.filename);

      await RequisitionMachinery.create({
        requisitionId: requisition.id,
        name,
        type: cleanString(req.body.type),
        status: cleanString(req.body.status) || 'Idle',
        capacity: cleanString(req.body.capacity),
        manufacturer: cleanString(req.body.manufacturer),
        attributes,
        photos,
        updatedBy: req.user.userId
      });

      requisition.landUtilizationGallery = Array.from(new Set([...(requisition.landUtilizationGallery || []), ...photos]));
      requisition.landUtilizationUpdatedBy = req.user.userId;
      requisition.landUtilizationUpdatedAt = new Date();

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Machinery Added',
        userId: req.user.userId,
        timestamp: new Date(),
        remarks: name
      });
      requisition.lastUpdated = new Date();
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.status(201).json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.land-utilization.addMachinery] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
);

router.patch(
  '/:id/utilization/machinery/:machineryId',
  auth,
  requireRole('DM Tehsil', 'Super Admin'),
  upload.array('photos', 10),
  async (req, res) => {
    try {
      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const machinery = await RequisitionMachinery.findOne({
        where: { id: req.params.machineryId, requisitionId: requisition.id }
      });
      if (!machinery) {
        return res.status(404).json({ msg: 'Machinery not found' });
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
        const updatedName = cleanString(req.body.name);
        if (!updatedName) {
          return res.status(400).json({ msg: 'Machinery name cannot be empty.' });
        }
        machinery.name = updatedName;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'type')) {
        machinery.type = cleanString(req.body.type);
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
        machinery.status = cleanString(req.body.status) || machinery.status;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'capacity')) {
        machinery.capacity = cleanString(req.body.capacity);
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'manufacturer')) {
        machinery.manufacturer = cleanString(req.body.manufacturer);
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'attributes')) {
        machinery.attributes = parseJsonField(req.body.attributes, machinery.attributes || {});
      }

      const keepPhotos = parseJsonField(req.body.keepPhotos, []);
      const keepSet = new Set(Array.isArray(keepPhotos) ? keepPhotos : []);
      const existingPhotos = Array.isArray(machinery.photos) ? machinery.photos : [];
      const retained = existingPhotos.filter(photo => keepSet.has(photo));
      const removed = existingPhotos.filter(photo => !keepSet.has(photo));
      const newPhotos = (req.files || []).map(file => file.filename);
      machinery.photos = [...retained, ...newPhotos];
      deleteFilesQuietly(removed);

      // Update gallery on requisition
      const currentGallery = Array.isArray(requisition.landUtilizationGallery) ? requisition.landUtilizationGallery : [];
      requisition.landUtilizationGallery = Array.from(new Set([...currentGallery.filter(photo => !removed.includes(photo)), ...newPhotos]));

      machinery.updatedBy = req.user.userId;
      await machinery.save();

      requisition.landUtilizationUpdatedBy = req.user.userId;
      requisition.landUtilizationUpdatedAt = new Date();

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Machinery Updated',
        userId: req.user.userId,
        timestamp: new Date(),
        remarks: machinery.name
      });
      requisition.lastUpdated = new Date();
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.land-utilization.updateMachinery] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
);

router.post(
  '/:id/utilization/progress',
  auth,
  requireRole('DM Tehsil', 'Super Admin'),
  upload.array('photos', 10),
  async (req, res) => {
    try {
      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const status = cleanString(req.body.status);
      if (!status) {
        return res.status(400).json({ msg: 'Progress status is required.' });
      }

      const description = cleanString(req.body.description);
      const progressDateRaw = cleanString(req.body.progressDate);
      const progressDate = progressDateRaw ? new Date(progressDateRaw) : new Date();
      const percentageRaw = req.body.completionPercentage;
      const percentageNum = percentageRaw === undefined || percentageRaw === null
        ? null
        : Number(percentageRaw);
      const completionPercentage = Number.isFinite(percentageNum)
        ? Math.min(100, Math.max(0, Number(percentageNum.toFixed(2))))
        : undefined;
      const attachments = (req.files || []).map(file => file.filename);

      await RequisitionProgressUpdate.create({
        requisitionId: requisition.id,
        status,
        description,
        progressDate,
        completionPercentage,
        attachments,
        updatedBy: req.user.userId
      });

      requisition.landUtilizationGallery = Array.from(new Set([...(requisition.landUtilizationGallery || []), ...attachments]));
      requisition.landUtilizationUpdatedBy = req.user.userId;
      requisition.landUtilizationUpdatedAt = new Date();

      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Physical Progress Logged',
        userId: req.user.userId,
        timestamp: new Date(),
        remarks: status
      });
      requisition.lastUpdated = new Date();
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.status(201).json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.land-utilization.addProgress] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
);

// ============================================================================
// Workflow forwarding routes
// ============================================================================

router.patch('/:id/dm-forward-bcc', auth, requireRole('DM Tehsil', 'Tehsil DM', 'Super Admin'), async (req, res) => {
  try {
    const { officerId, remarks } = req.body;
    const remarksText = ensureRemarks(remarks, 'Forwarded to BCC officer.');
    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) {
      return res.status(404).json({ msg: 'Not found' });
    }
    if (!statusIn(requisition.status, WORKFLOW_STATUSES.PENDING_DM)) {
      return res.status(400).json({ msg: 'Case is not awaiting DM review.' });
    }
    const isSuperAdmin = req.user?.role === 'Super Admin';
    const currentAssignee = resolveId(requisition.assignedTo);
    if (!isSuperAdmin && currentAssignee && currentAssignee !== resolveId(req.user.userId)) {
      return res.status(403).json({ msg: 'This requisition is not in your DM queue.' });
    }
    const targetOfficerId = await pickOfficerId(officerId, ['BCC Officer Tehsil', 'BCC Officer']);
    if (!targetOfficerId) {
      return res.status(404).json({ msg: 'No BCC officer available for assignment.' });
    }
    requisition.status = WORKFLOW_STATUSES.PENDING_BCC;
    requisition.assignedTo = targetOfficerId;
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Forwarded to BCC Officer',
      userId: req.user.userId,
      timestamp: new Date(),
      remarks: remarksText
    });
    requisition.lastUpdated = new Date();
    await requisition.save();
    const full = await reloadRequisition(requisition.id);
    res.json(serializeRequisition(full));
  } catch (err) {
    console.error('[requisition.dm-forward-bcc] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
  }
});

router.patch('/:id/bcc-forward-tm', auth, requireRole('BCC Officer Tehsil', 'BCC Officer', 'Super Admin'), async (req, res) => {
  try {
    const { officerId, remarks } = req.body;
    const remarksText = ensureRemarks(remarks, 'Forwarded to Tehsil Manager.');
    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) {
      return res.status(404).json({ msg: 'Not found' });
    }
    if (!statusIn(requisition.status, WORKFLOW_STATUSES.PENDING_BCC)) {
      return res.status(400).json({ msg: 'Case is not awaiting BCC officer review.' });
    }
    const isSuperAdmin = req.user?.role === 'Super Admin';
    if (!isSuperAdmin && resolveId(requisition.assignedTo) !== resolveId(req.user.userId)) {
      return res.status(403).json({ msg: 'This requisition is not assigned to you.' });
    }
    const targetOfficerId = await pickOfficerId(officerId, ['Tehsil Manager']);
    if (!targetOfficerId) {
      return res.status(404).json({ msg: 'No Tehsil Manager available for assignment.' });
    }
    requisition.status = WORKFLOW_STATUSES.PENDING_TM;
    requisition.assignedTo = targetOfficerId;
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Forwarded to TM',
      userId: req.user.userId,
      timestamp: new Date(),
      remarks: remarksText
    });
    requisition.lastUpdated = new Date();
    await requisition.save();
    const full = await reloadRequisition(requisition.id);
    res.json(serializeRequisition(full));
  } catch (err) {
    console.error('[requisition.bcc-forward-tm] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
  }
});

router.patch('/:id/tm-forward-chief', auth, requireRole('Tehsil Manager', 'Super Admin'), async (req, res) => {
  try {
    const { officerId, remarks } = req.body;
    const remarksText = ensureRemarks(remarks, 'Forwarded to BCC Specialist.');
    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) {
      return res.status(404).json({ msg: 'Not found' });
    }
    if (!statusIn(requisition.status, WORKFLOW_STATUSES.PENDING_TM)) {
      return res.status(400).json({ msg: 'Case is not awaiting TM review.' });
    }
    const isSuperAdmin = req.user?.role === 'Super Admin';
    if (!isSuperAdmin && resolveId(requisition.assignedTo) !== resolveId(req.user.userId)) {
      return res.status(403).json({ msg: 'This requisition is not assigned to you.' });
    }
    const targetOfficerId = await pickOfficerId(officerId, ['BCC Specialist']);
    if (!targetOfficerId) {
      return res.status(404).json({ msg: 'No BCC Specialist available for assignment.' });
    }
    requisition.status = WORKFLOW_STATUSES.PENDING_CHIEF;
    requisition.assignedTo = targetOfficerId;
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Forwarded to BCC Specialist',
      userId: req.user.userId,
      timestamp: new Date(),
      remarks: remarksText
    });
    requisition.lastUpdated = new Date();
    await requisition.save();
    const full = await reloadRequisition(requisition.id);
    res.json(serializeRequisition(full));
  } catch (err) {
    console.error('[requisition.tm-forward-chief] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
  }
});

router.patch('/:id/chief-forward-bcc', auth, requireRole('BCC Specialist', 'Super Admin'), async (req, res) => {
  try {
    const { officerId, remarks } = req.body;
    const remarksText = ensureRemarks(remarks, 'Returned to BCC officer for WB dispatch.');
    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) {
      return res.status(404).json({ msg: 'Not found' });
    }
    if (!statusIn(requisition.status, WORKFLOW_STATUSES.PENDING_CHIEF)) {
      return res.status(400).json({ msg: 'Case is not awaiting BCC Specialist review.' });
    }
    const isSuperAdmin = req.user?.role === 'Super Admin';
    if (!isSuperAdmin && resolveId(requisition.assignedTo) !== resolveId(req.user.userId)) {
      return res.status(403).json({ msg: 'This requisition is not assigned to you.' });
    }
    const targetOfficerId = await pickOfficerId(officerId, ['BCC Officer Tehsil', 'BCC Officer']);
    if (!targetOfficerId) {
      return res.status(404).json({ msg: 'No BCC officer available for assignment.' });
    }
    requisition.status = WORKFLOW_STATUSES.PENDING_WB_DISPATCH;
    requisition.assignedTo = targetOfficerId;
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Sent to BCC for WB dispatch',
      userId: req.user.userId,
      timestamp: new Date(),
      remarks: remarksText
    });
    requisition.lastUpdated = new Date();
    await requisition.save();
    const full = await reloadRequisition(requisition.id);
    res.json(serializeRequisition(full));
  } catch (err) {
    console.error('[requisition.chief-forward-bcc] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
  }
});

router.patch('/:id/bcc-forward-wb', auth, requireRole('BCC Officer Tehsil', 'BCC Officer', 'Super Admin'), async (req, res) => {
  try {
    const { officerId, remarks } = req.body;
    const remarksText = ensureRemarks(remarks, 'Forwarded to WB user.');
    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) {
      return res.status(404).json({ msg: 'Not found' });
    }
    if (!statusIn(requisition.status, WORKFLOW_STATUSES.PENDING_WB_DISPATCH)) {
      return res.status(400).json({ msg: 'Case is not ready for WB dispatch.' });
    }
    const isSuperAdmin = req.user?.role === 'Super Admin';
    if (!isSuperAdmin && resolveId(requisition.assignedTo) !== resolveId(req.user.userId)) {
      return res.status(403).json({ msg: 'This requisition is not assigned to you.' });
    }
    const targetOfficerId = await pickOfficerId(officerId, ['WB User']);
    if (!targetOfficerId) {
      return res.status(404).json({ msg: 'No WB user available for assignment.' });
    }
    requisition.status = WORKFLOW_STATUSES.PENDING_WB_APPROVAL;
    requisition.assignedTo = targetOfficerId;
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Forwarded to WB User',
      userId: req.user.userId,
      timestamp: new Date(),
      remarks: remarksText
    });
    requisition.lastUpdated = new Date();
    await requisition.save();
    const full = await reloadRequisition(requisition.id);
    res.json(serializeRequisition(full));
  } catch (err) {
    console.error('[requisition.bcc-forward-wb] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
  }
});

router.patch('/:id/wb-approve', auth, requireRole('WB User', 'Super Admin'), async (req, res) => {
  try {
    const { remarks, officerId } = req.body;
    const remarksText = ensureRemarks(remarks, 'Approved by WB user.');
    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) {
      return res.status(404).json({ msg: 'Not found' });
    }
    if (!statusIn(requisition.status, WORKFLOW_STATUSES.PENDING_WB_APPROVAL)) {
      return res.status(400).json({ msg: 'Case is not awaiting WB approval.' });
    }
    const isSuperAdmin = req.user?.role === 'Super Admin';
    if (!isSuperAdmin && resolveId(requisition.assignedTo) !== resolveId(req.user.userId)) {
      return res.status(403).json({ msg: 'This requisition is not assigned to you.' });
    }
    const targetOfficerId = await pickOfficerId(officerId, ['BCC Specialist']);
    if (!targetOfficerId) {
      return res.status(404).json({ msg: 'No BCC Specialist available for reassignment.' });
    }
    requisition.status = WORKFLOW_STATUSES.WB_APPROVED;
    requisition.assignedTo = targetOfficerId;
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'WB Approval Granted',
      userId: req.user.userId,
      timestamp: new Date(),
      remarks: remarksText
    });
    requisition.lastUpdated = new Date();
    await requisition.save();
    const full = await reloadRequisition(requisition.id);
    res.json(serializeRequisition(full));
  } catch (err) {
    console.error('[requisition.wb-approve] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
  }
});

router.patch('/:id/chief-mark-tm', auth, requireRole('BCC Specialist', 'Super Admin'), async (req, res) => {
  try {
    const { officerId, remarks } = req.body;
    const remarksText = ensureRemarks(remarks, 'Marked back to TM.');
    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) {
      return res.status(404).json({ msg: 'Not found' });
    }
    if (!statusIn(requisition.status, WORKFLOW_STATUSES.WB_APPROVED)) {
      return res.status(400).json({ msg: 'Case is not in WB approved state.' });
    }
    const isSuperAdmin = req.user?.role === 'Super Admin';
    if (!isSuperAdmin && resolveId(requisition.assignedTo) !== resolveId(req.user.userId)) {
      return res.status(403).json({ msg: 'This requisition is not assigned to you.' });
    }
    const targetOfficerId = await pickOfficerId(officerId, ['Tehsil Manager']);
    if (!targetOfficerId) {
      return res.status(404).json({ msg: 'No Tehsil Manager available for assignment.' });
    }
    requisition.status = WORKFLOW_STATUSES.MARKED_TO_TM;
    requisition.assignedTo = targetOfficerId;
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Marked to TM',
      userId: req.user.userId,
      timestamp: new Date(),
      remarks: remarksText
    });
    requisition.lastUpdated = new Date();
    await requisition.save();
    const full = await reloadRequisition(requisition.id);
    res.json(serializeRequisition(full));
  } catch (err) {
    console.error('[requisition.chief-mark-tm] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
  }
});

router.patch('/:id/tm-forward-bcc', auth, requireRole('Tehsil Manager', 'Super Admin'), async (req, res) => {
  try {
    const { officerId, remarks } = req.body;
    const remarksText = ensureRemarks(remarks, 'Forwarded to BCC officer for closure.');
    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) {
      return res.status(404).json({ msg: 'Not found' });
    }
    if (!statusIn(requisition.status, WORKFLOW_STATUSES.MARKED_TO_TM)) {
      return res.status(400).json({ msg: 'Case is not marked to TM.' });
    }
    const isSuperAdmin = req.user?.role === 'Super Admin';
    if (!isSuperAdmin && resolveId(requisition.assignedTo) !== resolveId(req.user.userId)) {
      return res.status(403).json({ msg: 'This requisition is not assigned to you.' });
    }
    const targetOfficerId = await pickOfficerId(officerId, ['BCC Officer Tehsil', 'BCC Officer']);
    if (!targetOfficerId) {
      return res.status(404).json({ msg: 'No BCC officer available for closure.' });
    }
    requisition.status = WORKFLOW_STATUSES.PENDING_BCC_CLOSURE;
    requisition.assignedTo = targetOfficerId;
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Forwarded to BCC for closure',
      userId: req.user.userId,
      timestamp: new Date(),
      remarks: remarksText
    });
    requisition.lastUpdated = new Date();
    await requisition.save();
    const full = await reloadRequisition(requisition.id);
    res.json(serializeRequisition(full));
  } catch (err) {
    console.error('[requisition.tm-forward-bcc] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
  }
});

router.patch('/:id/bcc-close', auth, requireRole('BCC Officer Tehsil', 'BCC Officer', 'Super Admin'), async (req, res) => {
  try {
    const { remarks } = req.body;
    const remarksText = ensureRemarks(remarks, 'Case closed by BCC officer.');
    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) {
      return res.status(404).json({ msg: 'Not found' });
    }
    if (!statusIn(requisition.status, WORKFLOW_STATUSES.PENDING_BCC_CLOSURE)) {
      return res.status(400).json({ msg: 'Case is not in BCC closure stage.' });
    }
    const isSuperAdmin = req.user?.role === 'Super Admin';
    if (!isSuperAdmin && resolveId(requisition.assignedTo) !== resolveId(req.user.userId)) {
      return res.status(403).json({ msg: 'This requisition is not assigned to you.' });
    }
    requisition.status = WORKFLOW_STATUSES.CLOSED;
    requisition.assignedTo = null;
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Case Closed by BCC',
      userId: req.user.userId,
      timestamp: new Date(),
      remarks: remarksText
    });
    requisition.lastUpdated = new Date();
    await requisition.save();
    const full = await reloadRequisition(requisition.id);
    res.json(serializeRequisition(full));
  } catch (err) {
    console.error('[requisition.bcc-close] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
  }
});

router.patch(
  '/:id/revert',
  auth,
  requireRole(
    'DM Tehsil',
    'Tehsil DM',
    'BCC Officer Tehsil',
    'BCC Officer',
    'BCC Specialist',
    'Tehsil Manager',
    'WB User',
    'Super Admin'
  ),
  async (req, res) => {
    try {
      const { remarks, toStatus, officerId } = req.body;
      const remarksText = (remarks || '').toString().trim();
      if (!remarksText) {
        return res.status(400).json({ msg: 'Remarks are required to revert a requisition.' });
      }
      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Not found' });
      }

      const targetStatusRaw = (toStatus || '').toString().trim();
      const normalizedTarget = normalizeStatus(targetStatusRaw);
      const matchedStatus = normalizedTarget
        ? WORKFLOW_STATUS_LIST.find(status => normalizeStatus(status) === normalizedTarget)
        : null;
      const effectiveStatus = matchedStatus || (targetStatusRaw || 'Reverted');
      const assignmentRoles = matchedStatus ? WORKFLOW_ASSIGNMENT_ROLES[matchedStatus] || [] : [];

      let nextAssignedTo = requisition.assignedTo;
      if (matchedStatus === WORKFLOW_STATUSES.CLOSED) {
        nextAssignedTo = null;
      } else if (assignmentRoles.length) {
        const resolvedAssignee = await pickOfficerId(officerId, assignmentRoles);
        if (!resolvedAssignee) {
          return res.status(400).json({
            msg: `Unable to revert to ${matchedStatus}: no eligible officer available for reassignment.`
          });
        }
        nextAssignedTo = resolvedAssignee;
      } else if (officerId) {
        const resolvedManualId = resolveId(officerId);
        if (resolvedManualId) {
          nextAssignedTo = resolvedManualId;
        }
      } else if (!matchedStatus) {
        nextAssignedTo = null;
      }

      const previousStatus = requisition.status || '';
      requisition.status = effectiveStatus;
      requisition.assignedTo = nextAssignedTo || null;
      await RequisitionActivityLog.create({
        requisitionId: requisition.id,
        action: 'Reverted',
        userId: req.user.userId,
        timestamp: new Date(),
        remarks: remarksText,
        meta: {
          fromStatus: previousStatus || undefined,
          toStatus: effectiveStatus,
          assignedTo: nextAssignedTo || undefined
        }
      });
      requisition.lastUpdated = new Date();
      await requisition.save();
      const full = await reloadRequisition(requisition.id);
      res.json(serializeRequisition(full));
    } catch (err) {
      console.error('[requisition.revert] error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message, stack: err.stack });
    }
  }
);

// Debug helper: log unmatched requests under /requisition
// (This will rarely be hit when specific routes exist; it's helpful for diagnosing 404s.)
router.use((req, res) => {
  console.warn('[requisition.router] No matching route for', req.method, req.originalUrl);
  res.status(404).json({ msg: 'Requisition route not found', method: req.method, url: req.originalUrl });
});

module.exports = router;
