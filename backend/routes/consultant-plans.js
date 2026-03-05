const express = require('express');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  ConsultantPlan,
  ConsultantPlanAttachment,
  ConsultantPlanMaintenanceRecord,
  User,
  sequelize
} = require('../models-sql');
const auth = require('../middleware/auth');
const {
  needsTehsilScope,
  resolveUserTehsils,
  buildTehsilScopeQuery,
  tehsilMatches
} = require('../utils/tehsilScope');
const {
  consultantPlanValidation,
  handleValidationErrors,
  validateObjectId,
  validateGeoJSON
} = require('../middleware/validators');

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  Multer upload configuration                                       */
/* ------------------------------------------------------------------ */

const PLAN_UPLOAD_DIR = path.join(__dirname, '../uploads/consultant-plans');
const PLAN_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);

ensureDirectory(PLAN_UPLOAD_DIR);

const planStorage = multer.diskStorage({
  destination(req, file, cb) {
    ensureDirectory(PLAN_UPLOAD_DIR);
    cb(null, PLAN_UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, `plan-${timestamp}-${random}${ext}`);
  }
});

function planFileFilter(req, file, cb) {
  if (PLAN_ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error('Unsupported attachment type.'));
}

const planUploadMiddleware = multer({
  storage: planStorage,
  limits: {
    fileSize: 12 * 1024 * 1024, // 12 MB per file
    files: 5
  },
  fileFilter: planFileFilter
}).array('attachments', 5);

/* ------------------------------------------------------------------ */
/*  Asset definitions                                                 */
/* ------------------------------------------------------------------ */

const WATER_SUPPLY_ASSETS = [
  { value: 'water-pipeline', label: 'Water Pipeline', category: 'Water Supply' },
  { value: 'overhead-reservoir', label: 'Overhead Reservoir (OHR)', category: 'Water Supply' },
  { value: 'stand-post', label: 'Stand Post', category: 'Water Supply' },
  { value: 'ro-plant', label: 'RO Plant', category: 'Water Supply' },
  { value: 'bore-hole', label: 'Bore Hole Location', category: 'Water Supply' },
  { value: 'tubewell-pump-room', label: 'Tubewell Pump Room', category: 'Water Supply' }
];

const SEWERAGE_ASSETS = [
  { value: 'abr', label: 'ABR', category: 'Sewerage' },
  { value: 'sewage-line', label: 'Sewage Line', category: 'Sewerage' },
  { value: 'manhole', label: 'Manhole', category: 'Sewerage' },
  { value: 'other-sewerage-asset', label: 'Other Sewerage Asset', category: 'Sewerage' }
];

const SUPPORT_ASSETS = [
  { value: 'guard-room', label: 'Guard Room', category: 'Support Facility' },
  { value: 'solar-installation', label: 'Solar Installation', category: 'Support Facility' },
  { value: 'water-support-asset', label: 'Other Water Support Asset', category: 'Support Facility' }
];

const CUSTOM_ASSETS = [{ value: 'custom-asset', label: 'Custom Asset', category: 'Custom' }];

const ASSET_DEFINITIONS = [
  ...WATER_SUPPLY_ASSETS,
  ...SEWERAGE_ASSETS,
  ...SUPPORT_ASSETS,
  ...CUSTOM_ASSETS
];

/* ------------------------------------------------------------------ */
/*  Asset indexes and constants                                       */
/* ------------------------------------------------------------------ */

const ASSET_VALUE_INDEX = new Map();
const ASSET_LABEL_INDEX = new Map();
ASSET_DEFINITIONS.forEach(def => {
  const valueKey = normaliseKey(def.value);
  ASSET_VALUE_INDEX.set(valueKey, def);
  ASSET_VALUE_INDEX.set(slugKey(def.value), def);
  ASSET_LABEL_INDEX.set(normaliseKey(def.label), def);
});

const DEFAULT_LAYER_NAME = 'PRMSC Red Book Assets';
const MAINTENANCE_ALERT_WINDOW_DAYS = 45;

/* ------------------------------------------------------------------ */
/*  Role sets                                                         */
/* ------------------------------------------------------------------ */

const READ_ROLES = new Set([
  'Super Admin',
  'Admin',
  'DM Tehsil',
  'Tehsil DM',
  'Infra Engineer',
  'CID',
  'BCC Specialist',
  'BCC Officer Tehsil',
  'BCC Officer',
  'EDCS Consultant',
  'EDCS User',
  'Tehsil Manager',
  'RA Environment',
  'PCRWR Sampler',
  'PCRWR Lab'
]);

const WRITE_ROLES = new Set(['EDCS Consultant', 'EDCS User', 'Super Admin', 'Admin', 'Tehsil Manager']);
const MANAGE_ROLES = new Set(['Super Admin', 'Admin', 'Tehsil Manager']);
const MAINTENANCE_ROLES = new Set(['Super Admin', 'Admin', 'Tehsil Manager']);
const CONSULTANT_CREATOR_ROLES = new Set(['EDCS Consultant', 'EDCS User']);

/* ------------------------------------------------------------------ */
/*  Common Sequelize includes                                         */
/* ------------------------------------------------------------------ */

const PLAN_INCLUDES = [
  { model: User, as: 'creator', attributes: ['id', 'name', 'role'] },
  { model: User, as: 'updater', attributes: ['id', 'name', 'role'] },
  { model: ConsultantPlanAttachment, as: 'attachments' },
  { model: ConsultantPlanMaintenanceRecord, as: 'maintenanceRecords' }
];

/* ================================================================== */
/*  ROUTES                                                            */
/* ================================================================== */

router.use(auth);

/* ------------------------------------------------------------------ */
/*  GET /definitions                                                  */
/* ------------------------------------------------------------------ */

router.get('/definitions', (req, res) => {
  if (!canRead(req.user?.role)) {
    return res.status(403).json({ msg: 'Forbidden' });
  }
  res.json(ASSET_DEFINITIONS);
});

/* ------------------------------------------------------------------ */
/*  POST /upload                                                      */
/* ------------------------------------------------------------------ */

router.post('/upload', (req, res) => {
  if (!canWrite(req.user?.role)) {
    return res.status(403).json({ msg: 'Forbidden' });
  }

  planUploadMiddleware(req, res, err => {
    if (err) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ msg: err.message || 'Unable to process attachments.' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const attachments = files.map(file => ({
      storedName: path.posix.join('consultant-plans', file.filename),
      originalName: file.originalname || '',
      mimeType: file.mimetype || '',
      size: file.size || 0,
    }));

    res.status(201).json({
      attachments: attachments.map(item => ({
        ...item,
        url: buildAttachmentUrl(item.storedName),
      })),
    });
  });
});

/* ------------------------------------------------------------------ */
/*  GET / — list plans                                                */
/* ------------------------------------------------------------------ */

router.get('/', async (req, res) => {
  try {
    if (!canRead(req.user?.role)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    const role = req.user?.role || '';
    const userId = getUserId(req);
    const tehsilScope = await resolveUserTehsils(req.user);

    if (needsTehsilScope(role) && tehsilScope.length === 0 && role !== 'Tehsil Manager') {
      return res.json([]);
    }

    if (req.query.tehsil && Array.isArray(tehsilScope) && tehsilScope.length && !tehsilMatches(tehsilScope, req.query.tehsil)) {
      return res.json([]);
    }

    const queries = [];
    if (!needsTehsilScope(role) || tehsilScope.length > 0) {
      const scopedFilter = buildFilter(req, tehsilScope);
      queries.push(fetchConsultantPlans(scopedFilter));
    }

    if (role === 'Tehsil Manager' && userId) {
      const ownerFilter = buildFilter(req, []);
      ownerFilter.maintenanceOwner = userId;
      queries.push(fetchConsultantPlans(ownerFilter));
    }

    if (!queries.length) {
      return res.json([]);
    }

    const resultSets = await Promise.all(queries);
    const planMap = new Map();
    resultSets.forEach(list => {
      list.forEach(plan => {
        const key = plan.id;
        if (key && !planMap.has(key)) {
          planMap.set(key, plan);
        }
      });
    });

    const combined = Array.from(planMap.values()).sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    res.json(combined.map(serializePlan));
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /layers                                                       */
/* ------------------------------------------------------------------ */

router.get('/layers', async (req, res) => {
  try {
    if (!canRead(req.user?.role)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    const tehsilScope = await resolveUserTehsils(req.user);
    if (needsTehsilScope(req.user?.role) && tehsilScope.length === 0) {
      return res.json({ layers: {} });
    }

    if (req.query.tehsil && Array.isArray(tehsilScope) && tehsilScope.length && !tehsilMatches(tehsilScope, req.query.tehsil)) {
      return res.json({ layers: {} });
    }

    const filter = buildFilter(req, tehsilScope);
    const plans = await ConsultantPlan.findAll({
      where: filter,
      attributes: [
        'id', 'title', 'assetType', 'assetLabel', 'category', 'layerName',
        'description', 'requisitionId', 'tehsil', 'district',
        'featureType', 'featureGeometry', 'featureProperties',
        'attributes', 'maintenanceOwner', 'maintenanceOwnerName',
        'maintenanceOwnerRole', 'updatedAt', 'createdAt'
      ],
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']]
    });

    const features = plans
      .map(plan => planToFeature(plan))
      .filter(Boolean);

    const format = (req.query.format || '').toString().trim().toLowerCase();
    if (format === 'geojson') {
      return res.json({ type: 'FeatureCollection', features });
    }

    const grouped = {};
    features.forEach(feature => {
      const layerName = feature.properties?.layerName || 'Consultant Plans';
      if (!grouped[layerName]) {
        grouped[layerName] = [];
      }
      grouped[layerName].push(feature);
    });

    res.json({ layers: grouped });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /:id                                                          */
/* ------------------------------------------------------------------ */

router.get('/:id', async (req, res) => {
  try {
    if (!canRead(req.user?.role)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    const { id } = req.params;
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId < 1) {
      return res.status(400).json({ msg: 'Invalid plan identifier' });
    }
    const role = req.user?.role || '';
    const tehsilScope = needsTehsilScope(role) ? await resolveUserTehsils(req.user) : [];
    const plan = await ConsultantPlan.findByPk(numId, {
      include: PLAN_INCLUDES
    });
    if (!plan) {
      return res.status(404).json({ msg: 'Plan not found' });
    }
    if (needsTehsilScope(role)) {
      if (tehsilScope.length === 0 || !tehsilMatches(tehsilScope, plan.tehsil)) {
        return res.status(403).json({ msg: 'Forbidden' });
      }
    }
    if (!canReadPlan(req, plan)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    res.json(serializePlan(plan));
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  POST / — create plan                                              */
/* ------------------------------------------------------------------ */

router.post('/', async (req, res) => {
  try {
    if (!canWrite(req.user?.role)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    const userId = getUserId(req);
    const requesterRole = req.user?.role || '';
    if (!userId) {
      return res.status(401).json({ msg: 'Session expired. Please log in again.' });
    }

    // Debug log
    console.log('POST /consultant-plans - Request body:', JSON.stringify(req.body, null, 2));

    const assetDef = resolveAssetDefinition(req.body.assetType || req.body.assetLabel);
    if (!assetDef) {
      return res.status(400).json({ msg: 'Unsupported asset type.' });
    }

    let feature;
    try {
      feature = parseFeature(req.body.feature);
    } catch (err) {
      console.error('Feature parsing error:', err.message);
      return res.status(400).json({ msg: err.message || 'Invalid feature payload.' });
    }

    let attributes;
    try {
      attributes = parseAttributes(req.body.attributes, req.body.attributesJson);
    } catch (err) {
      console.error('Attributes parsing error:', err.message);
      return res.status(400).json({ msg: err.message || 'Attributes must be valid JSON.' });
    }

    const attachments = parsePlanAttachments(req.body.attachments);

    // Split the GeoJSON Feature into separate DB fields
    const featureData = withFeatureProperties(feature, assetDef);
    const planData = {
      title: safeString(req.body.title) || assetDef.label,
      assetType: assetDef.value,
      assetLabel: assetDef.label,
      category: assetDef.category,
      layerName: safeString(req.body.layerName) || DEFAULT_LAYER_NAME,
      description: safeString(req.body.description),
      requisitionId: resolveIntId(req.body.requisition || req.body.requisitionId),
      tehsil: safeString(req.body.tehsil),
      district: safeString(req.body.district),
      featureType: featureData.type || 'Feature',
      featureGeometry: featureData.geometry,
      featureProperties: featureData.properties || {},
      attributes,
      createdBy: userId,
      updatedBy: userId
    };

    // Auto-assign maintenance owner (works on the plain data object)
    await ensureMaintenanceOwner(planData, {
      forceReassign: CONSULTANT_CREATOR_ROLES.has(requesterRole),
      creatorRole: requesterRole,
      creatorId: userId
    });

    console.log('Saving plan:', planData.title, 'of type:', planData.assetType);
    const plan = await ConsultantPlan.create(planData);

    // Create attachments in the separate table
    if (attachments.length > 0) {
      await ConsultantPlanAttachment.bulkCreate(
        attachments.map(a => ({ ...a, consultantPlanId: plan.id }))
      );
    }

    // Reload with associations for the response
    await plan.reload({ include: PLAN_INCLUDES });

    res.status(201).json(serializePlan(plan));
  } catch (err) {
    console.error('POST /consultant-plans error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  PATCH /:id — update plan                                          */
/* ------------------------------------------------------------------ */

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId < 1) {
      return res.status(400).json({ msg: 'Invalid plan identifier' });
    }
    const plan = await ConsultantPlan.findByPk(numId);
    if (!plan) {
      return res.status(404).json({ msg: 'Plan not found' });
    }
    if (!canModify(req, plan)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ msg: 'Session expired. Please log in again.' });
    }

    const requesterRole = req.user?.role || '';
    const isMaintenanceManager = MAINTENANCE_ROLES.has(requesterRole);
    const originalTehsil = plan.tehsil || '';
    let tehsilChanged = false;
    let maintenanceTouched = false;

    if (req.body.assetType || req.body.assetLabel) {
      const assetDef = resolveAssetDefinition(req.body.assetType || req.body.assetLabel);
      if (!assetDef) {
        return res.status(400).json({ msg: 'Unsupported asset type.' });
      }
      plan.assetType = assetDef.value;
      plan.assetLabel = assetDef.label;
      plan.category = assetDef.category;
      // Reconstruct current feature, apply asset properties, split back
      const currentFeature = {
        type: plan.featureType || 'Feature',
        geometry: plan.featureGeometry,
        properties: plan.featureProperties || {}
      };
      const updated = withFeatureProperties(currentFeature, assetDef);
      plan.featureType = updated.type || 'Feature';
      plan.featureGeometry = updated.geometry;
      plan.featureProperties = updated.properties || {};
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'title')) {
      const title = safeString(req.body.title);
      plan.title = title || plan.assetLabel;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
      plan.description = safeString(req.body.description);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'requisition') || Object.prototype.hasOwnProperty.call(req.body, 'requisitionId')) {
      plan.requisitionId = resolveIntId(req.body.requisition || req.body.requisitionId);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'tehsil')) {
      const nextTehsil = safeString(req.body.tehsil);
      if (nextTehsil !== originalTehsil) {
        tehsilChanged = true;
      }
      plan.tehsil = nextTehsil;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'district')) {
      plan.district = safeString(req.body.district);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'layerName')) {
      plan.layerName = safeString(req.body.layerName) || plan.layerName;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'feature')) {
      let updatedFeature;
      try {
        updatedFeature = parseFeature(req.body.feature);
      } catch (err) {
        return res.status(400).json({ msg: err.message || 'Invalid feature payload.' });
      }
      const finalFeature = withFeatureProperties(updatedFeature, {
        value: plan.assetType,
        label: plan.assetLabel,
        category: plan.category
      });
      plan.featureType = finalFeature.type || 'Feature';
      plan.featureGeometry = finalFeature.geometry;
      plan.featureProperties = finalFeature.properties || {};
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'attributes') || Object.prototype.hasOwnProperty.call(req.body, 'attributesJson')) {
      try {
        plan.attributes = parseAttributes(req.body.attributes, req.body.attributesJson);
      } catch (err) {
        return res.status(400).json({ msg: err.message || 'Attributes must be valid JSON.' });
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'attachments')) {
      const attachments = parsePlanAttachments(req.body.attachments);
      // Replace all existing attachments with the new set
      await ConsultantPlanAttachment.destroy({ where: { consultantPlanId: plan.id } });
      if (attachments.length > 0) {
        await ConsultantPlanAttachment.bulkCreate(
          attachments.map(a => ({ ...a, consultantPlanId: plan.id }))
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'maintenanceOwner')) {
      if (!isMaintenanceManager) {
        return res.status(403).json({ msg: 'Forbidden' });
      }
      const ownerId = resolveIntId(req.body.maintenanceOwner);
      if (ownerId) {
        const manager = await User.findOne({
          where: { id: ownerId, role: 'Tehsil Manager' },
          attributes: ['id', 'name', 'role']
        });
        if (!manager) {
          return res.status(400).json({ msg: 'Maintenance owner must be a Tehsil Manager.' });
        }
        plan.maintenanceOwner = manager.id;
        plan.maintenanceOwnerName = manager.name || 'Tehsil Manager';
        plan.maintenanceOwnerRole = 'Tehsil Manager';
      } else {
        plan.maintenanceOwner = null;
        plan.maintenanceOwnerName = 'Tehsil Manager';
        plan.maintenanceOwnerRole = 'Tehsil Manager';
      }
      maintenanceTouched = true;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'maintenanceOwnerName')) {
      if (!isMaintenanceManager) {
        return res.status(403).json({ msg: 'Forbidden' });
      }
      plan.maintenanceOwnerName = safeString(req.body.maintenanceOwnerName) || 'Tehsil Manager';
      maintenanceTouched = true;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'maintenanceOwnerRole')) {
      plan.maintenanceOwnerRole = 'Tehsil Manager';
      maintenanceTouched = true;
    }

    await ensureMaintenanceOwner(plan, {
      forceReassign: tehsilChanged && !maintenanceTouched,
      creatorRole: requesterRole,
      creatorId: userId
    });

    plan.updatedBy = userId;
    await plan.save();

    // Reload with associations for the response
    await plan.reload({ include: PLAN_INCLUDES });

    res.json(serializePlan(plan));
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  DELETE /:id                                                       */
/* ------------------------------------------------------------------ */

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId < 1) {
      return res.status(400).json({ msg: 'Invalid plan identifier' });
    }
    const plan = await ConsultantPlan.findByPk(numId);
    if (!plan) {
      return res.status(404).json({ msg: 'Plan not found' });
    }
    if (!canModify(req, plan)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    await plan.destroy();
    res.json({ msg: 'Plan removed successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

/* ================================================================== */
/*  HELPERS                                                           */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/*  buildFilter — Sequelize WHERE clause from query params            */
/* ------------------------------------------------------------------ */

function buildFilter(req, tehsilScope = []) {
  const role = req.user?.role || '';
  const userId = req.user?.userId || '';
  const filter = {};
  const andFilters = [];

  if (role === 'EDCS Consultant' || role === 'EDCS User') {
    filter.createdBy = userId;
  }

  const { tehsil, district, category, assetType, requisitionId, search } = req.query;

  if (Array.isArray(tehsilScope) && tehsilScope.length) {
    const scopedQuery = buildTehsilScopeQuery(tehsilScope, 'tehsil');
    if (scopedQuery) {
      andFilters.push(scopedQuery);
    }
  }

  if (tehsil) {
    andFilters.push({ tehsil: { [Op.like]: `%${escapeLike(tehsil.toString())}%` } });
  }
  if (district) {
    andFilters.push({ district: { [Op.like]: `%${escapeLike(district.toString())}%` } });
  }
  if (category) {
    // Exact match (case-insensitive with default MySQL collation)
    andFilters.push({ category: { [Op.like]: escapeLike(category.toString()) } });
  }
  if (assetType) {
    const assetDef = resolveAssetDefinition(assetType);
    if (assetDef) {
      filter.assetType = assetDef.value;
    } else {
      andFilters.push({ assetType: { [Op.like]: `%${escapeLike(assetType.toString())}%` } });
    }
  }
  if (requisitionId) {
    const numReqId = Number(requisitionId);
    if (Number.isFinite(numReqId) && numReqId > 0) {
      filter.requisitionId = numReqId;
    }
  }
  if (search) {
    const expr = { [Op.like]: `%${escapeLike(search.toString())}%` };
    filter[Op.or] = [
      { title: expr },
      { description: expr },
      { assetLabel: expr },
      { tehsil: expr }
    ];
  }

  if (andFilters.length) {
    filter[Op.and] = andFilters;
  }

  return filter;
}

/* ------------------------------------------------------------------ */
/*  Permission helpers                                                */
/* ------------------------------------------------------------------ */

function canRead(role) {
  return READ_ROLES.has(role || '');
}

function canWrite(role) {
  return WRITE_ROLES.has(role || '');
}

function canModify(req, plan) {
  const role = req.user?.role || '';
  if (MANAGE_ROLES.has(role)) {
    return true;
  }
  if (role === 'EDCS Consultant' || role === 'EDCS User') {
    return String(plan?.createdBy) === String(req.user?.userId);
  }
  return false;
}

function canReadPlan(req, plan) {
  const role = req.user?.role || '';
  if (MANAGE_ROLES.has(role)) {
    return true;
  }
  if (role === 'EDCS Consultant' || role === 'EDCS User') {
    return String(plan?.createdBy) === String(req.user?.userId);
  }
  return READ_ROLES.has(role);
}

/* ------------------------------------------------------------------ */
/*  resolveAssetDefinition                                            */
/* ------------------------------------------------------------------ */

function resolveAssetDefinition(raw) {
  const input = safeString(raw);
  if (!input) {
    return null;
  }
  const key = normaliseKey(input);
  if (ASSET_VALUE_INDEX.has(key)) {
    return ASSET_VALUE_INDEX.get(key);
  }
  const slugged = slugKey(input);
  if (ASSET_VALUE_INDEX.has(slugged)) {
    return ASSET_VALUE_INDEX.get(slugged);
  }
  if (ASSET_LABEL_INDEX.has(key)) {
    return ASSET_LABEL_INDEX.get(key);
  }
  if (key === 'other') {
    return ASSET_VALUE_INDEX.get('custom-asset');
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Feature parsing                                                   */
/* ------------------------------------------------------------------ */

function parseFeature(raw) {
  const payload = normaliseFeaturePayload(raw);
  if (!payload) {
    throw new Error('Feature payload is required.');
  }
  if (payload.type !== 'Feature') {
    throw new Error('Feature payload must be a GeoJSON Feature.');
  }
  if (!payload.geometry || typeof payload.geometry !== 'object') {
    throw new Error('Feature geometry is required.');
  }
  if (!payload.geometry.type || typeof payload.geometry.coordinates === 'undefined') {
    throw new Error('Feature geometry is not valid GeoJSON.');
  }
  const geometry = {
    type: payload.geometry.type,
    coordinates: payload.geometry.coordinates
  };
  const properties = payload.properties && typeof payload.properties === 'object' && !Array.isArray(payload.properties)
    ? { ...payload.properties }
    : {};
  return { type: 'Feature', geometry, properties };
}

function normaliseFeaturePayload(raw) {
  if (!raw) {
    return null;
  }
  if (typeof raw === 'string') {
    try {
      return normaliseFeaturePayload(JSON.parse(raw));
    } catch (err) {
      throw new Error('Feature payload must be valid JSON.');
    }
  }
  if (raw.type === 'FeatureCollection' && Array.isArray(raw.features) && raw.features.length) {
    return normaliseFeaturePayload(raw.features[0]);
  }
  if (raw.type && raw.coordinates && !raw.geometry) {
    return {
      type: 'Feature',
      geometry: {
        type: raw.type,
        coordinates: raw.coordinates
      },
      properties: raw.properties && typeof raw.properties === 'object' ? raw.properties : {}
    };
  }
  return raw;
}

function parseAttributes(primary, fallback) {
  const source = primary !== undefined ? primary : fallback;
  if (!source) {
    return {};
  }
  if (typeof source === 'string') {
    const text = source.trim();
    if (!text) {
      return {};
    }
    try {
      const parsed = JSON.parse(text);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
      throw new Error('Attributes must be valid JSON.');
    }
  }
  if (typeof source === 'object' && !Array.isArray(source)) {
    return { ...source };
  }
  return {};
}

function withFeatureProperties(feature, assetDef) {
  const baseFeature = feature && typeof feature === 'object' && feature.geometry
    ? feature
    : { type: 'Feature', geometry: { type: 'Point', coordinates: [] }, properties: {} };
  const featureClone = {
    type: 'Feature',
    geometry: cloneGeometry(baseFeature.geometry),
    properties: { ...(baseFeature.properties || {}) }
  };
  featureClone.properties.layerName = DEFAULT_LAYER_NAME;
  featureClone.properties.assetType = assetDef.label;
  featureClone.properties.assetValue = assetDef.value;
  featureClone.properties.category = assetDef.category;
  if (!featureClone.properties.maintenanceOwnerRole) {
    featureClone.properties.maintenanceOwnerRole = 'Tehsil Manager';
  }
  return featureClone;
}

/* ------------------------------------------------------------------ */
/*  planToFeature — Reconstruct a GeoJSON Feature from DB fields      */
/* ------------------------------------------------------------------ */

function planToFeature(plan) {
  if (!plan || !plan.featureGeometry) {
    return null;
  }
  const geometry = cloneGeometry(plan.featureGeometry);
  const baseProperties = plan.featureProperties && typeof plan.featureProperties === 'object' && !Array.isArray(plan.featureProperties)
    ? { ...plan.featureProperties }
    : {};
  const attrs = plan.attributes && typeof plan.attributes === 'object' && !Array.isArray(plan.attributes)
    ? { ...plan.attributes }
    : {};
  const properties = {
    ...baseProperties,
    planId: plan.id?.toString?.() || '',
    title: plan.title || baseProperties.title || plan.assetLabel,
    description: plan.description || baseProperties.description || '',
    assetType: plan.assetLabel || baseProperties.assetType || plan.assetType || '',
    assetLabel: plan.assetLabel || baseProperties.assetLabel || plan.assetType,
    assetValue: plan.assetType || baseProperties.assetValue || '',
    category: plan.category || baseProperties.category || 'Custom',
    layerName: plan.layerName || baseProperties.layerName || 'Consultant Plans',
    requisitionId: plan.requisitionId ? plan.requisitionId.toString() : baseProperties.requisitionId || null,
    tehsil: plan.tehsil || baseProperties.tehsil || '',
    district: plan.district || baseProperties.district || '',
    updatedAt: plan.updatedAt || baseProperties.updatedAt || null,
    createdAt: plan.createdAt || baseProperties.createdAt || null,
    attributes: attrs
  };
  Object.entries(attrs).forEach(([key, value]) => {
    if (properties[key] === undefined) {
      properties[key] = value;
    }
  });
  if (plan.maintenanceOwnerRole) {
    properties.maintenanceOwnerRole = plan.maintenanceOwnerRole;
  }
  if (plan.maintenanceOwnerName) {
    properties.maintenanceOwnerName = plan.maintenanceOwnerName;
  }
  if (plan.maintenanceOwner) {
    properties.maintenanceOwnerId = plan.maintenanceOwner.toString();
  }
  return {
    type: 'Feature',
    geometry,
    properties
  };
}

/* ------------------------------------------------------------------ */
/*  serializePlan — Convert a Sequelize plan instance for the API     */
/* ------------------------------------------------------------------ */

function serializePlan(plan) {
  const plain = plan.get ? plan.get({ plain: true }) : plan;

  // Reconstruct the GeoJSON Feature from the split DB fields
  const feature = {
    type: plain.featureType || 'Feature',
    geometry: plain.featureGeometry,
    properties: plain.featureProperties || {}
  };

  return {
    id: plain.id?.toString?.() || '',
    title: plain.title,
    assetType: plain.assetType,
    assetLabel: plain.assetLabel,
    category: plain.category,
    layerName: plain.layerName,
    description: plain.description || '',
    requisitionId: plain.requisitionId ? plain.requisitionId.toString() : null,
    tehsil: plain.tehsil || '',
    district: plain.district || '',
    feature,
    attributes: plain.attributes || {},
    attachments: Array.isArray(plain.attachments)
      ? plain.attachments
          .map(serializeAttachment)
          .filter(Boolean)
      : [],
    maintenanceOwnerRole: plain.maintenanceOwnerRole || '',
    maintenanceOwner: plain.maintenanceOwner
      ? { id: plain.maintenanceOwner.toString(), name: plain.maintenanceOwnerName || '', role: plain.maintenanceOwnerRole || 'Tehsil Manager' }
      : null,
    maintenanceOwnerName: plain.maintenanceOwnerName || '',
    maintenanceRecords: Array.isArray(plain.maintenanceRecords)
      ? plain.maintenanceRecords.map(serializeMaintenanceRecord).filter(Boolean)
      : [],
    createdBy: serialiseUserRef(plain.creator),
    updatedBy: serialiseUserRef(plain.updater),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
}

/* ------------------------------------------------------------------ */
/*  Serialisation helpers                                             */
/* ------------------------------------------------------------------ */

function serialiseUserRef(ref) {
  if (!ref) {
    return null;
  }
  if (typeof ref === 'object') {
    return {
      id: ref.id?.toString?.() || '',
      name: ref.name || '',
      role: ref.role || ''
    };
  }
  return { id: ref.toString(), name: '', role: '' };
}

function getUserId(req) {
  return req.user?.userId || req.user?.id || null;
}

/* ------------------------------------------------------------------ */
/*  Attachment parsing                                                */
/* ------------------------------------------------------------------ */

function parsePlanAttachments(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return [];
  }

  let source = raw;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) {
      return [];
    }
    try {
      source = JSON.parse(text);
    } catch (err) {
      // If parsing fails, treat string as single stored name
      return [
        {
          storedName: text,
          originalName: path.basename(text),
          mimeType: '',
          size: 0
        }
      ];
    }
  }

  if (!Array.isArray(source)) {
    return [];
  }

  const seen = new Set();
  const attachments = [];
  source.forEach(entry => {
    const normalised = normaliseAttachment(entry);
    if (!normalised) {
      return;
    }
    const key = `${normalised.storedName}|${normalised.originalName}`.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    attachments.push(normalised);
  });
  return attachments;
}

function normaliseAttachment(entry) {
  if (!entry) {
    return null;
  }
  if (typeof entry === 'string') {
    const storedName = safeString(entry);
    if (!storedName) {
      return null;
    }
    return {
      storedName,
      originalName: path.basename(storedName),
      mimeType: '',
      size: 0
    };
  }
  const storedName = safeString(entry.storedName || entry.path || entry.key || '');
  if (!storedName) {
    return null;
  }
  return {
    storedName,
    originalName: safeString(entry.originalName || entry.name || path.basename(storedName)),
    mimeType: safeString(entry.mimeType || entry.type || ''),
    size: Number(entry.size) && Number(entry.size) > 0 ? Number(entry.size) : 0
  };
}

function serializeAttachment(entry) {
  if (!entry) {
    return null;
  }
  const storedName = safeString(entry.storedName || entry.path || '');
  if (!storedName) {
    return null;
  }
  return {
    storedName,
    originalName: safeString(entry.originalName || entry.name || path.basename(storedName)),
    mimeType: safeString(entry.mimeType || entry.type || ''),
    size: Number(entry.size) && Number(entry.size) > 0 ? Number(entry.size) : 0,
    url: buildAttachmentUrl(storedName)
  };
}

function serializeMaintenanceRecord(entry) {
  if (!entry) {
    return null;
  }
  const costValue = Number(entry.cost);
  return {
    id: entry.id?.toString?.() || '',
    performedAt: entry.performedAt || null,
    type: entry.type || 'preventive',
    status: entry.status || 'completed',
    description: safeString(entry.description),
    cost: Number.isFinite(costValue) ? costValue : 0,
    notes: safeString(entry.notes),
    recordedBy: entry.recordedBy
      ? { id: entry.recordedBy.toString(), name: entry.recordedByName || '', role: '' }
      : null,
    recordedByName: safeString(entry.recordedByName)
  };
}

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                   */
/* ------------------------------------------------------------------ */

function buildAttachmentUrl(storedName) {
  const normalised = safeString(storedName).replace(/^[\\/]+/, '');
  if (!normalised) {
    return '';
  }
  const posixPath = normalised.split('\\').join('/');
  return `/uploads/${posixPath}`;
}

function ensureDirectory(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function cleanupUploadedFiles(files) {
  if (!Array.isArray(files)) {
    return;
  }
  files.forEach(file => {
    if (!file?.path) {
      return;
    }
    fs.unlink(file.path, () => {});
  });
}

function safeString(value) {
  return (value ?? '').toString().trim();
}

function normaliseKey(value) {
  return safeString(value).toLowerCase();
}

function slugKey(value) {
  return normaliseKey(value).replace(/[^a-z0-9]+/g, '-');
}

function escapeRegex(value) {
  return safeString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escape special characters for SQL LIKE patterns (%, _, \).
 */
function escapeLike(value) {
  return safeString(value).replace(/[%_\\]/g, '\\$&');
}

/* ------------------------------------------------------------------ */
/*  resolveIntId — Integer-based ID resolution (replaces ObjectId)    */
/* ------------------------------------------------------------------ */

function resolveIntId(value) {
  const text = safeString(value);
  if (!text) {
    return null;
  }
  const num = Number(text);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/* ------------------------------------------------------------------ */
/*  cloneGeometry                                                     */
/* ------------------------------------------------------------------ */

function cloneGeometry(geometry) {
  if (!geometry || typeof geometry !== 'object') {
    return geometry;
  }
  try {
    return JSON.parse(JSON.stringify(geometry));
  } catch {
    return geometry;
  }
}

/* ------------------------------------------------------------------ */
/*  ensureMaintenanceOwner — auto-assign Tehsil Manager               */
/* ------------------------------------------------------------------ */

async function ensureMaintenanceOwner(planDoc, options = {}) {
  if (!planDoc) {
    return;
  }
  const { forceReassign = false, creatorRole = '', creatorId = null } = options;
  const normalisedCreatorRole = safeString(creatorRole);
  planDoc.maintenanceOwnerRole = 'Tehsil Manager';

  if (normalisedCreatorRole === 'Tehsil Manager' && creatorId) {
    const manager = await User.findOne({
      where: { id: creatorId, role: 'Tehsil Manager' },
      attributes: ['id', 'name', 'role']
    });
    if (manager) {
      planDoc.maintenanceOwner = manager.id;
      planDoc.maintenanceOwnerName = manager.name || 'Tehsil Manager';
      applyMaintenanceMetadata(planDoc);
      return;
    }
  }

  if (forceReassign || !planDoc.maintenanceOwner) {
    const manager = await findTehsilManager(planDoc.tehsil);
    if (manager) {
      planDoc.maintenanceOwner = manager.id;
      planDoc.maintenanceOwnerName = manager.name || 'Tehsil Manager';
    } else if (!planDoc.maintenanceOwnerName) {
      planDoc.maintenanceOwnerName = 'Tehsil Manager';
    }
  }

  applyMaintenanceMetadata(planDoc);
}

/* ------------------------------------------------------------------ */
/*  findTehsilManager — locate a Tehsil Manager user                  */
/* ------------------------------------------------------------------ */

async function findTehsilManager(tehsil) {
  const text = safeString(tehsil);
  const candidateQueries = [];

  if (text) {
    // Exact match on address (case-insensitive via default collation)
    candidateQueries.push({
      where: { role: 'Tehsil Manager', activeStatus: 'active', address: { [Op.like]: escapeLike(text) } },
      attributes: ['id', 'name', 'role'],
      order: [['id', 'ASC']]
    });
    // Contains match on address
    candidateQueries.push({
      where: { role: 'Tehsil Manager', activeStatus: 'active', address: { [Op.like]: `%${escapeLike(text)}%` } },
      attributes: ['id', 'name', 'role'],
      order: [['id', 'ASC']]
    });
  }

  // Any active Tehsil Manager
  candidateQueries.push({
    where: { role: 'Tehsil Manager', activeStatus: 'active' },
    attributes: ['id', 'name', 'role'],
    order: [['id', 'ASC']]
  });

  // Any Tehsil Manager (regardless of status)
  candidateQueries.push({
    where: { role: 'Tehsil Manager' },
    attributes: ['id', 'name', 'role'],
    order: [['id', 'ASC']]
  });

  for (const query of candidateQueries) {
    const manager = await User.findOne(query);
    if (manager) {
      return manager;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  applyMaintenanceMetadata — sync owner info into featureProperties */
/* ------------------------------------------------------------------ */

function applyMaintenanceMetadata(planDoc) {
  if (!planDoc) {
    return;
  }
  if (!planDoc.featureProperties || typeof planDoc.featureProperties !== 'object' || Array.isArray(planDoc.featureProperties)) {
    planDoc.featureProperties = {};
  }

  planDoc.featureProperties.maintenanceOwnerRole = planDoc.maintenanceOwnerRole || 'Tehsil Manager';

  if (planDoc.maintenanceOwner && typeof planDoc.maintenanceOwner.toString === 'function') {
    planDoc.featureProperties.maintenanceOwnerId = planDoc.maintenanceOwner.toString();
  } else if (!planDoc.maintenanceOwner) {
    delete planDoc.featureProperties.maintenanceOwnerId;
  }

  if (planDoc.maintenanceOwnerName) {
    planDoc.featureProperties.maintenanceOwnerName = planDoc.maintenanceOwnerName;
  }

  // Tell Sequelize the JSON field was mutated in-place (no-op on plain objects)
  if (typeof planDoc.changed === 'function') {
    planDoc.changed('featureProperties', true);
  }
}

/* ------------------------------------------------------------------ */
/*  fetchConsultantPlans — query with standard includes                */
/* ------------------------------------------------------------------ */

function fetchConsultantPlans(filter) {
  return ConsultantPlan.findAll({
    where: filter,
    include: PLAN_INCLUDES,
    order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']]
  });
}

module.exports = router;
