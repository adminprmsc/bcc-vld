const express = require('express');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const auth = require('../middleware/auth');
const {
  ConsultantPlan,
  WaterQualitySample,
  WaterQualitySampleStatusHistory,
  WaterQualitySampleAttachment,
  User,
  sequelize
} = require('../models-sql');
const { computePotabilityIndex } = require('../services/waterQuality');
const {
  needsTehsilScope,
  resolveUserTehsils,
  buildTehsilScopeQuery,
  tehsilMatches
} = require('../utils/tehsilScope');
const {
  waterQualityValidation,
  handleValidationErrors,
  validateObjectId
} = require('../middleware/validators');

const router = express.Router();
router.use(auth);

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ALLOWED_UPLOAD_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/plain'
]);

const SAMPLE_UPLOAD_DIR = path.join(__dirname, '../uploads/water-quality');
ensureDirectory(SAMPLE_UPLOAD_DIR);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    ensureDirectory(SAMPLE_UPLOAD_DIR);
    cb(null, SAMPLE_UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, `sample-${timestamp}-${random}${ext}`);
  }
});

function uploadFilter(req, file, cb) {
  if (!ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
    cb(new Error('Unsupported attachment type.'));
    return;
  }
  cb(null, true);
}

const uploadMiddleware = multer({
  storage,
  fileFilter: uploadFilter,
  limits: { fileSize: 16 * 1024 * 1024, files: 5 }
}).array('attachments', 5);

const ROLE_RA = 'RA Environment';
const ROLE_SAMPLER = 'PCRWR Sampler';
const ROLE_LAB = 'PCRWR Lab';

const RA_ROLES = new Set([ROLE_RA]);
const PCRWR_SAMPLER_ROLES = new Set([ROLE_SAMPLER]);
const PCRWR_LAB_ROLES = new Set([ROLE_LAB]);
const PCRWR_ROLES = new Set([...PCRWR_SAMPLER_ROLES, ...PCRWR_LAB_ROLES]);
const MANAGER_ROLES = new Set(['Super Admin', 'Admin']);

/* ------------------------------------------------------------------ */
/*  Standard Sequelize includes for eager-loading                     */
/* ------------------------------------------------------------------ */

function sampleIncludes() {
  return [
    { model: ConsultantPlan, as: 'plan', attributes: ['id', 'title', 'category', 'tehsil', 'district', 'criticalFlag', 'latestQualityStatusStatus', 'latestQualityStatusScore', 'latestQualityStatusLabel', 'latestQualityStatusUpdatedAt'] },
    { model: User, as: 'sampler', attributes: ['id', 'name', 'role'] },
    { model: User, as: 'creator', attributes: ['id', 'name', 'role'] },
    { model: WaterQualitySampleStatusHistory, as: 'statusHistory', separate: true, order: [['createdAt', 'ASC']] },
    { model: WaterQualitySampleAttachment, as: 'attachments', separate: true }
  ];
}

function sampleIncludesDetailed() {
  return [
    ...sampleIncludes(),
    { model: User, as: 'analyst', attributes: ['id', 'name', 'role'] }
  ];
}

/* ------------------------------------------------------------------ */
/*  GET / – list samples with filter                                  */
/* ------------------------------------------------------------------ */

router.get('/', async (req, res) => {
  try {
    const role = req.user?.role || '';
    const requiresScope = needsTehsilScope(role);
    const tehsilScope = requiresScope ? await resolveUserTehsils(req.user) : [];

    if (requiresScope && tehsilScope.length === 0) {
      return res.json([]);
    }

    const requestedTehsil = req.query.tehsil?.toString();
    if (requestedTehsil && requiresScope && !tehsilMatches(tehsilScope, requestedTehsil)) {
      return res.json([]);
    }

    const where = buildFilter(req, tehsilScope);
    const samples = await WaterQualitySample.findAll({
      where,
      include: sampleIncludes(),
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']],
      limit: limitInt(req.query.limit, 200)
    });

    res.json(samples.map(serializeSample));
  } catch (err) {
    console.error('GET /water-quality-samples error:', err);
    return handleRouteError(res, err, 'Server error');
  }
});

/* ------------------------------------------------------------------ */
/*  GET /:id – get single sample                                      */
/* ------------------------------------------------------------------ */

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ msg: 'Invalid sample identifier' });
    }

    const sample = await WaterQualitySample.findByPk(id, {
      include: sampleIncludesDetailed()
    });
    if (!sample) {
      return res.status(404).json({ msg: 'Sample not found' });
    }

    const role = req.user?.role || '';
    if (needsTehsilScope(role)) {
      const tehsilScope = await resolveUserTehsils(req.user);
      if (tehsilScope.length === 0 || !tehsilMatches(tehsilScope, sample.planSnapshotTehsil || sample.plan?.tehsil)) {
        return res.status(403).json({ msg: 'Forbidden' });
      }
    }
    if (!canReadSample(req, sample)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    res.json(serializeSample(sample));
  } catch (err) {
    console.error('GET /water-quality-samples/:id error:', err);
    return handleRouteError(res, err, 'Server error');
  }
});

/* ------------------------------------------------------------------ */
/*  POST / – create sample (flag critical asset)                      */
/* ------------------------------------------------------------------ */

router.post('/', async (req, res) => {
  try {
    if (!canCreate(req.user?.role)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    const plan = await ConsultantPlan.findByPk(req.body.planId);
    if (!plan) {
      return res.status(404).json({ msg: 'Linked asset not found' });
    }

    const userId = req.user?.userId;
    const creatorName = safeString(req.user?.name);

    const sample = await WaterQualitySample.create({
      planId: plan.id,
      planSnapshotPlanId: plan.id,
      planSnapshotTitle: plan.title,
      planSnapshotCategory: plan.category,
      planSnapshotTehsil: plan.tehsil,
      planSnapshotDistrict: plan.district,
      status: 'awaiting_assignment',
      createdBy: userId,
      createdByName: creatorName,
      updatedBy: userId,
      updatedByName: creatorName
    });

    // Create initial status history entry
    await WaterQualitySampleStatusHistory.create({
      sampleId: sample.id,
      ...buildStatusEvent('critical_flagged', req.user, 'Critical asset flagged')
    });

    await maybeAutoAssignSampler(sample, req.user);

    // Update the plan with critical flag and latest quality status
    await ConsultantPlan.update({
      latestQualityStatusStatus: 'pending_sample',
      latestQualityStatusLabel: 'Awaiting Sample',
      latestQualityStatusScore: null,
      latestQualityStatusUpdatedAt: new Date(),
      criticalFlag: true,
      criticalReason: safeString(req.body.reason) || 'Flagged for water quality sampling',
      criticalMarkedAt: new Date(),
      criticalMarkedBy: userId || null,
      criticalMarkedByName: creatorName,
      criticalAcknowledgedAt: null,
      criticalAcknowledgedBy: null,
      criticalAcknowledgedByName: ''
    }, { where: { id: plan.id } });

    // Reload with associations for response
    const fullSample = await WaterQualitySample.findByPk(sample.id, {
      include: sampleIncludes()
    });

    res.status(201).json(serializeSample(fullSample));
  } catch (err) {
    console.error('POST /water-quality-samples error:', err);
    return handleRouteError(res, err, 'Unable to create sample');
  }
});

/* ------------------------------------------------------------------ */
/*  Auto-assign sampler helpers                                       */
/* ------------------------------------------------------------------ */

async function maybeAutoAssignSampler(sample, actor) {
  try {
    const sampler = await resolveDefaultSampler();
    if (!sampler) {
      return;
    }

    const assignedAt = new Date();
    sample.assignedSampler = sampler.id;
    sample.assignedSamplerName = sampler.name || 'PCRWR Sampler';
    sample.assignedAt = assignedAt;
    sample.status = 'awaiting_collection';
    auditUpdate(sample, actor);
    await sample.save();

    await WaterQualitySampleStatusHistory.create({
      sampleId: sample.id,
      ...buildStatusEvent('assignment', actor, `Auto-assigned to ${sampler.name || 'PCRWR Sampler'}`)
    });
  } catch (err) {
    console.error('Auto-assignment error:', err.message || err);
  }
}

async function resolveDefaultSampler() {
  const preferredEmail = (process.env.DEFAULT_WATER_QUALITY_SAMPLER_EMAIL || '').trim();
  if (preferredEmail) {
    const samplerByEmail = await User.findOne({ where: { email: preferredEmail, role: ROLE_SAMPLER } });
    if (samplerByEmail) {
      return samplerByEmail;
    }
  }

  const activeSampler = await User.findOne({
    where: { role: ROLE_SAMPLER, activeStatus: 'active' },
    order: [['id', 'ASC']]
  });
  if (activeSampler) {
    return activeSampler;
  }

  return User.findOne({
    where: { role: ROLE_SAMPLER },
    order: [['id', 'ASC']]
  });
}

/* ------------------------------------------------------------------ */
/*  POST /:id/assign – assign sampler                                 */
/* ------------------------------------------------------------------ */

router.post('/:id/assign', async (req, res) => {
  try {
    if (!RA_ROLES.has(req.user?.role || '')) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    const sample = await fetchEditableSample(req.params.id, req, res);
    if (!sample) {
      return;
    }
    if (['closed', 'cancelled', 'results_ready', 'in_lab'].includes(sample.status)) {
      return res.status(409).json({ msg: 'Sample has already moved past assignment.' });
    }
    if (!['awaiting_assignment', 'awaiting_collection'].includes(sample.status)) {
      return res.status(409).json({ msg: 'Sample is not in a state that allows assignment.' });
    }

    const samplerId = parseId(req.body.samplerId);
    if (!samplerId) {
      return res.status(400).json({ msg: 'Sampler is required' });
    }

    const sampler = await User.findOne({
      where: { id: samplerId, role: 'PCRWR Sampler' },
      attributes: ['id', 'name', 'role']
    });
    if (!sampler) {
      return res.status(400).json({ msg: 'Sampler not found or not PCRWR Sampler' });
    }

    sample.assignedSampler = sampler.id;
    sample.assignedSamplerName = sampler.name || 'PCRWR Sampler';
    sample.assignedAt = new Date();
    sample.status = 'awaiting_collection';
    auditUpdate(sample, req.user);
    await sample.save();

    await WaterQualitySampleStatusHistory.create({
      sampleId: sample.id,
      ...buildStatusEvent('assignment', req.user, `Assigned to ${sampler.name || 'PCRWR Sampler'}`)
    });

    const fullSample = await WaterQualitySample.findByPk(sample.id, {
      include: sampleIncludes()
    });
    res.json(serializeSample(fullSample));
  } catch (err) {
    console.error('POST /water-quality-samples/:id/assign error:', err);
    return handleRouteError(res, err, 'Unable to assign sample');
  }
});

/* ------------------------------------------------------------------ */
/*  POST /:id/collection – update collection data                     */
/* ------------------------------------------------------------------ */

router.post('/:id/collection', async (req, res) => {
  try {
    ensureRole(req.user, PCRWR_SAMPLER_ROLES);

    const sample = await fetchEditableSample(req.params.id, req, res);
    if (!sample) {
      return;
    }
    if (!['awaiting_collection', 'collecting'].includes(sample.status)) {
      return res.status(409).json({ msg: 'Sample is not ready for collection.' });
    }
    if (!ensureSamplerOwnership(sample, req.user, res)) {
      return;
    }

    const coords = parseCoords(req.body.location);
    sample.collectionCollectedAt = parseDate(req.body.collectedAt) || new Date();
    sample.collectionFieldNotes = safeString(req.body.fieldNotes);
    if (coords) {
      sample.collectionLocationLat = coords.lat;
      sample.collectionLocationLng = coords.lng;
    }
    sample.collectionCollectedBy = req.user?.userId;
    sample.collectionCollectedByName = safeString(req.user?.name);

    const alreadyCollecting = sample.status === 'collecting';
    sample.status = 'collecting';
    auditUpdate(sample, req.user);
    await sample.save();

    if (!alreadyCollecting) {
      await WaterQualitySampleStatusHistory.create({
        sampleId: sample.id,
        ...buildStatusEvent('collection_started', req.user, 'Field collection started')
      });
    }

    const fullSample = await WaterQualitySample.findByPk(sample.id, {
      include: sampleIncludes()
    });
    res.json(serializeSample(fullSample));
  } catch (err) {
    console.error('POST /water-quality-samples/:id/collection error:', err);
    return handleRouteError(res, err, 'Unable to update collection details');
  }
});

/* ------------------------------------------------------------------ */
/*  POST /:id/collection/complete – mark collection complete          */
/* ------------------------------------------------------------------ */

router.post('/:id/collection/complete', async (req, res) => {
  try {
    ensureRole(req.user, PCRWR_SAMPLER_ROLES);

    const sample = await fetchEditableSample(req.params.id, req, res);
    if (!sample) {
      return;
    }
    if (!['collecting', 'awaiting_collection'].includes(sample.status)) {
      return res.status(409).json({ msg: 'Sample cannot be marked collected in its current status.' });
    }
    if (!ensureSamplerOwnership(sample, req.user, res)) {
      return;
    }

    uploadMiddleware(req, res, async (err) => {
      try {
        if (err) {
          cleanupFiles(req.files);
          return res.status(400).json({ msg: err.message || 'Unable to process attachments.' });
        }

        // Save any new file attachments as collection type
        await saveFileAttachments(sample.id, req.files, 'collection');

        const coords = parseCoords(req.body.location);
        sample.collectionCollectedAt = parseDate(req.body.collectedAt) || new Date();
        sample.collectionFieldNotes = safeString(req.body.fieldNotes);
        if (coords) {
          sample.collectionLocationLat = coords.lat;
          sample.collectionLocationLng = coords.lng;
        }
        sample.collectionCollectedBy = req.user?.userId;
        sample.collectionCollectedByName = safeString(req.user?.name);

        sample.status = 'in_lab';
        auditUpdate(sample, req.user);
        await sample.save();

        await WaterQualitySampleStatusHistory.create({
          sampleId: sample.id,
          ...buildStatusEvent('collection_complete', req.user, 'Sample collected and dispatched')
        });

        const fullSample = await WaterQualitySample.findByPk(sample.id, {
          include: sampleIncludes()
        });
        res.json(serializeSample(fullSample));
      } catch (innerErr) {
        console.error('POST /water-quality-samples/:id/collection/complete inner error:', innerErr);
        return handleRouteError(res, innerErr, 'Unable to complete sample collection');
      }
    });
  } catch (err) {
    console.error('POST /water-quality-samples/:id/collection/complete error:', err);
    return handleRouteError(res, err, 'Unable to complete sample collection');
  }
});

/* ------------------------------------------------------------------ */
/*  POST /:id/lab – submit lab results with file upload               */
/* ------------------------------------------------------------------ */

router.post('/:id/lab', async (req, res) => {
  try {
    ensureRole(req.user, PCRWR_LAB_ROLES);

    const sample = await fetchEditableSample(req.params.id, req, res);
    if (!sample) {
      return;
    }
    if (!['in_lab', 'results_ready'].includes(sample.status)) {
      return res.status(409).json({ msg: 'Sample results can only be posted once received by the lab.' });
    }

    uploadMiddleware(req, res, async (err) => {
      try {
        if (err) {
          cleanupFiles(req.files);
          return res.status(400).json({ msg: err.message || 'Unable to process attachments.' });
        }

        // Save any new file attachments as lab_analysis type
        await saveFileAttachments(sample.id, req.files, 'lab_analysis');

        const metrics = normalizeLabMetrics(parseMetrics(req.body.metrics));

        sample.labAnalysisReceivedAt = parseDate(req.body.receivedAt) || sample.labAnalysisReceivedAt || new Date();
        sample.labAnalysisCompletedAt = parseDate(req.body.completedAt) || sample.labAnalysisCompletedAt || new Date();
        sample.labAnalysisMetrics = metrics;
        sample.labAnalysisAnalyst = req.user?.userId;
        sample.labAnalysisAnalystName = safeString(req.user?.name);
        sample.labAnalysisNotes = safeString(req.body.notes);

        const { value, rating } = computePotabilityIndex(metrics);
        sample.computedScoreIndexName = 'potability-index';
        sample.computedScoreValue = value;
        sample.computedScoreRating = rating;
        sample.computedScoreUpdatedAt = new Date();

        sample.status = 'results_ready';
        auditUpdate(sample, req.user);
        await sample.save();

        await WaterQualitySampleStatusHistory.create({
          sampleId: sample.id,
          ...buildStatusEvent('results_posted', req.user, 'Lab results posted')
        });

        // Update linked plan's latest quality status
        await ConsultantPlan.update({
          latestQualityStatusStatus: rating,
          latestQualityStatusScore: value,
          latestQualityStatusLabel: labelForRating(rating),
          latestQualityStatusUpdatedAt: new Date()
        }, { where: { id: sample.planId } });

        const fullSample = await WaterQualitySample.findByPk(sample.id, {
          include: sampleIncludesDetailed()
        });
        res.json(serializeSample(fullSample));
      } catch (innerErr) {
        console.error('POST /water-quality-samples/:id/lab inner error:', innerErr);
        return handleRouteError(res, innerErr, 'Unable to submit lab results');
      }
    });
  } catch (err) {
    console.error('POST /water-quality-samples/:id/lab error:', err);
    return handleRouteError(res, err, 'Unable to submit lab results');
  }
});

/* ------------------------------------------------------------------ */
/*  POST /:id/close – close sample                                    */
/* ------------------------------------------------------------------ */

router.post('/:id/close', async (req, res) => {
  try {
    ensureRole(req.user, new Set([...PCRWR_ROLES, ...RA_ROLES, ...MANAGER_ROLES]));

    const sample = await fetchEditableSample(req.params.id, req, res);
    if (!sample) {
      return;
    }
    if (['closed', 'cancelled'].includes(sample.status)) {
      return res.status(409).json({ msg: 'Sample is already closed or cancelled.' });
    }

    const note = safeString(req.body.note);
    sample.status = 'closed';
    auditUpdate(sample, req.user);
    await sample.save();

    await WaterQualitySampleStatusHistory.create({
      sampleId: sample.id,
      ...buildStatusEvent('closed', req.user, note || 'Sample closed')
    });

    // Clear critical flag on the plan
    await ConsultantPlan.update({
      criticalFlag: false,
      criticalReason: '',
      criticalMarkedAt: null,
      criticalMarkedBy: null,
      criticalMarkedByName: '',
      criticalAcknowledgedAt: null,
      criticalAcknowledgedBy: null,
      criticalAcknowledgedByName: ''
    }, { where: { id: sample.planId } });

    const fullSample = await WaterQualitySample.findByPk(sample.id, {
      include: sampleIncludes()
    });
    res.json(serializeSample(fullSample));
  } catch (err) {
    console.error('POST /water-quality-samples/:id/close error:', err);
    return handleRouteError(res, err, 'Unable to close sample');
  }
});

/* ------------------------------------------------------------------ */
/*  POST /:id/cancel – cancel sample                                  */
/* ------------------------------------------------------------------ */

router.post('/:id/cancel', async (req, res) => {
  try {
    ensureRole(req.user, new Set([...RA_ROLES, ...MANAGER_ROLES]));

    const sample = await fetchEditableSample(req.params.id, req, res);
    if (!sample) {
      return;
    }
    if (['closed', 'cancelled'].includes(sample.status)) {
      return res.status(409).json({ msg: 'Sample is already closed or cancelled.' });
    }

    const note = safeString(req.body.note);
    sample.status = 'cancelled';
    auditUpdate(sample, req.user);
    await sample.save();

    await WaterQualitySampleStatusHistory.create({
      sampleId: sample.id,
      ...buildStatusEvent('cancelled', req.user, note || 'Sample cancelled')
    });

    const fullSample = await WaterQualitySample.findByPk(sample.id, {
      include: sampleIncludes()
    });
    res.json(serializeSample(fullSample));
  } catch (err) {
    console.error('POST /water-quality-samples/:id/cancel error:', err);
    return handleRouteError(res, err, 'Unable to cancel sample');
  }
});

/* ------------------------------------------------------------------ */
/*  POST /:id/attachments – upload attachments                        */
/* ------------------------------------------------------------------ */

router.post('/:id/attachments', (req, res) => {
  try {
    ensureRole(req.user, PCRWR_ROLES);
  } catch (err) {
    return handleRouteError(res, err, 'Forbidden');
  }

  uploadMiddleware(req, res, (err) => {
    if (err) {
      cleanupFiles(req.files);
      return res.status(400).json({ msg: err.message || 'Unable to process attachments.' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const attachments = files.map((file) => ({
      storedName: path.posix.join('water-quality', file.filename),
      originalName: file.originalname || '',
      mimeType: file.mimetype || '',
      size: file.size || 0
    }));

    res.status(201).json({ attachments: attachments.map(decorateAttachment) });
  });
});

/* ------------------------------------------------------------------ */
/*  GET /plans/:planId – get samples for a plan                       */
/* ------------------------------------------------------------------ */

router.get('/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    if (!isValidId(planId)) {
      return res.status(400).json({ msg: 'Invalid plan identifier' });
    }

    const role = req.user?.role || '';
    const requiresScope = needsTehsilScope(role);
    const tehsilScope = requiresScope ? await resolveUserTehsils(req.user) : [];
    if (requiresScope && tehsilScope.length === 0) {
      return res.json([]);
    }

    const requestedTehsil = req.query.tehsil?.toString();
    if (requestedTehsil && requiresScope && !tehsilMatches(tehsilScope, requestedTehsil)) {
      return res.json([]);
    }

    const where = { planId: Number(planId) };

    if (Array.isArray(tehsilScope) && tehsilScope.length) {
      const scopeQuery = buildTehsilScopeQuery(tehsilScope, 'planSnapshotTehsil');
      if (scopeQuery) {
        Object.assign(where, scopeQuery);
      }
    }
    if (requestedTehsil) {
      where.planSnapshotTehsil = { [Op.like]: `%${escapeLike(requestedTehsil)}%` };
    }

    const samples = await WaterQualitySample.findAll({
      where,
      include: [
        { model: WaterQualitySampleStatusHistory, as: 'statusHistory', separate: true, order: [['createdAt', 'ASC']] },
        { model: WaterQualitySampleAttachment, as: 'attachments', separate: true }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitInt(req.query.limit, 50)
    });

    res.json(samples.map(serializeSample));
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

/* ================================================================== */
/*  Helper Functions                                                   */
/* ================================================================== */

function ensureRole(user, roles) {
  const role = user?.role || '';
  if (!roles.has(role)) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
}

/**
 * Build Sequelize WHERE clause from query parameters.
 */
function buildFilter(req, tehsilScope = []) {
  const role = req.user?.role || '';
  const conditions = [];

  if (RA_ROLES.has(role)) {
    conditions.push({ createdBy: req.user?.userId });
  }

  if (PCRWR_ROLES.has(role)) {
    conditions.push({
      [Op.or]: [
        { assignedSampler: req.user?.userId },
        { status: { [Op.in]: ['awaiting_collection', 'collecting', 'in_lab'] } }
      ]
    });
  }

  if (Array.isArray(tehsilScope) && tehsilScope.length) {
    const query = buildTehsilScopeQuery(tehsilScope, 'planSnapshotTehsil');
    if (query) {
      conditions.push(query);
    }
  }

  if (req.query.planId && isValidId(req.query.planId)) {
    conditions.push({ planId: Number(req.query.planId) });
  }

  if (req.query.status) {
    conditions.push({ status: req.query.status });
  }

  if (req.query.tehsil) {
    conditions.push({ planSnapshotTehsil: { [Op.like]: `%${escapeLike(req.query.tehsil)}%` } });
  }

  if (conditions.length === 0) {
    return {};
  }
  if (conditions.length === 1) {
    return conditions[0];
  }
  return { [Op.and]: conditions };
}

function canCreate(role) {
  return RA_ROLES.has(role || '') || MANAGER_ROLES.has(role || '');
}

function canReadSample(req, sample) {
  const role = req.user?.role || '';
  if (MANAGER_ROLES.has(role)) {
    return true;
  }
  if (RA_ROLES.has(role)) {
    return Number(sample.createdBy) === Number(req.user?.userId);
  }
  if (PCRWR_ROLES.has(role)) {
    return (
      Number(sample.assignedSampler) === Number(req.user?.userId) ||
      ['awaiting_collection', 'collecting', 'in_lab', 'results_ready'].includes(sample.status)
    );
  }
  return false;
}

async function fetchEditableSample(id, req, res) {
  if (!isValidId(id)) {
    res.status(400).json({ msg: 'Invalid sample identifier' });
    return null;
  }
  const sample = await WaterQualitySample.findByPk(id);
  if (!sample) {
    res.status(404).json({ msg: 'Sample not found' });
    return null;
  }
  const role = req.user?.role || '';
  if (needsTehsilScope(role)) {
    const tehsilScope = await resolveUserTehsils(req.user);
    if (tehsilScope.length === 0 || !tehsilMatches(tehsilScope, sample.planSnapshotTehsil)) {
      res.status(403).json({ msg: 'Forbidden' });
      return null;
    }
  }
  return sample;
}

function auditUpdate(sample, user) {
  sample.updatedBy = user?.userId || null;
  sample.updatedByName = safeString(user?.name || '');
}

/**
 * Build a status event object (for WaterQualitySampleStatusHistory.create).
 * Returns the fields WITHOUT sampleId — the caller adds that.
 */
function buildStatusEvent(code, user, note) {
  return {
    code,
    label: labelForStatus(code),
    note: note || '',
    tone: toneForStatus(code),
    createdBy: user?.userId,
    createdByName: safeString(user?.name)
  };
}

function toneForStatus(code) {
  switch (code) {
    case 'critical_flagged':
      return 'critical';
    case 'results_posted':
    case 'closed':
      return 'success';
    default:
      return 'info';
  }
}

function labelForStatus(code) {
  switch (code) {
    case 'critical_flagged':
      return 'Critical Flagged';
    case 'assignment':
      return 'Sampler Assigned';
    case 'collection_started':
      return 'Sampling Started';
    case 'collection_complete':
      return 'Sample Collected';
    case 'in_lab':
      return 'In Lab';
    case 'results_posted':
      return 'Lab Results Posted';
    case 'closed':
      return 'Closed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Updated';
  }
}

function labelForRating(rating) {
  switch (rating) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'fair':
      return 'Fair';
    case 'poor':
      return 'Poor';
    default:
      return 'Pending';
  }
}

/* ------------------------------------------------------------------ */
/*  ID / validation helpers                                            */
/* ------------------------------------------------------------------ */

function isValidId(value) {
  if (!value) return false;
  const num = Number(value);
  return num > 0 && Number.isFinite(num);
}

function parseId(value) {
  if (!value) return null;
  const num = Number(value);
  return (num > 0 && Number.isFinite(num)) ? num : null;
}

function toId(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = Number(value);
    return (num > 0 && Number.isFinite(num)) ? num : value;
  }
  if (typeof value === 'object' && value.id != null) {
    return toId(value.id);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Parse helpers                                                      */
/* ------------------------------------------------------------------ */

function parseDate(raw) {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCoords(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return null;
    try {
      return parseCoords(JSON.parse(text));
    } catch {
      const parts = text.split(',').map(Number);
      if (parts.length >= 2 && parts.every(Number.isFinite)) {
        return { lat: parts[0], lng: parts[1] };
      }
      return null;
    }
  }
  if (Array.isArray(value) && value.length >= 2) {
    const [lng, lat] = value.map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  if (typeof value === 'object') {
    const lat = Number(value.lat ?? value.latitude);
    const lng = Number(value.lng ?? value.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  return null;
}

function parseMetrics(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') {
    return { ...raw };
  }
  return {};
}

function normalizeLabMetrics(metrics) {
  const output = { ...(metrics || {}) };
  const mapping = {
    tehsil: ['tehsil', 'tehsil_name'],
    locationName: ['locationName', 'location', 'village', 'villageName'],
    settlementsOperational: ['settlementsOperational', 'numberOfSettlementsOperational', 'settlements'],
    waterStatus: ['waterStatus', 'status'],
    color: ['color'],
    taste: ['taste'],
    odour: ['odour', 'odor'],
    ec: ['ec', 'conductivity', 'electricalConductivity'],
    turbidity: ['turbidity'],
    physicalContamination: ['physicalContamination', 'physical'],
    ph: ['ph'],
    hco3: ['hco3', 'bicarbonate'],
    co3: ['co3', 'carbonate'],
    calcium: ['calcium', 'ca'],
    magnesium: ['magnesium', 'mg'],
    hardness: ['hardness', 'totalHardness'],
    chloride: ['chloride', 'cl'],
    sodium: ['sodium', 'na'],
    potassium: ['potassium', 'k'],
    sulfate: ['sulfate', 'so4'],
    nitrate: ['nitrate', 'no3'],
    tds: ['tds'],
    phosphate: ['phosphate', 'po4'],
    iron: ['iron', 'fe'],
    nitrite: ['nitrite', 'no2'],
    fluoride: ['fluoride', 'f'],
    aluminum: ['aluminum', 'al'],
    arsenic: ['arsenic', 'as'],
    barium: ['barium', 'ba'],
    cadmium: ['cadmium', 'cd'],
    cobalt: ['cobalt', 'co'],
    chromium: ['chromium', 'cr'],
    copper: ['copper', 'cu'],
    manganese: ['manganese', 'mn'],
    molybdenum: ['molybdenum', 'mo'],
    nickel: ['nickel', 'ni'],
    lead: ['lead', 'pb'],
    strontium: ['strontium', 'sr'],
    zinc: ['zinc', 'zn'],
    chemicalContamination: ['chemicalContamination'],
    totalColiforms: ['totalColiforms', 'total_coliforms'],
    fecalColiforms: ['fecalColiforms', 'fecal_coliforms'],
    ecoli: ['ecoli', 'e_coli'],
    biologicalContamination: ['biologicalContamination'],
    remarks: ['remarks', 'labRemarks'],
    safe: ['safe'],
    unsafe: ['unsafe']
  };

  const canonical = {};
  Object.entries(mapping).forEach(([targetKey, aliases]) => {
    for (const alias of aliases) {
      if (alias in output) {
        canonical[targetKey] = output[alias];
        break;
      }
    }
  });

  return canonical;
}

/* ------------------------------------------------------------------ */
/*  Attachment helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Persist multer-uploaded files as WaterQualitySampleAttachment rows.
 */
async function saveFileAttachments(sampleId, files, attachmentType) {
  const safeFiles = Array.isArray(files) ? files : [];
  for (const file of safeFiles) {
    await WaterQualitySampleAttachment.create({
      sampleId,
      attachmentType,
      storedName: path.posix.join('water-quality', file.filename),
      originalName: file.originalname || '',
      mimeType: file.mimetype || '',
      size: file.size || 0
    });
  }
}

function cleanupFiles(files) {
  if (!Array.isArray(files)) return;
  files.forEach((file) => {
    if (file?.path) {
      fs.unlink(file.path, () => {});
    }
  });
}

function decorateAttachment(entry) {
  const raw = entry.get ? entry.get({ plain: true }) : entry;
  return {
    id: raw.id || undefined,
    storedName: raw.storedName,
    originalName: raw.originalName,
    mimeType: raw.mimeType,
    size: raw.size,
    url: `/uploads/${raw.storedName}`.replace(/\\/g, '/').replace(/\/+/, '/uploads/')
  };
}

function decorateAttachmentList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(decorateAttachment);
}

/* ------------------------------------------------------------------ */
/*  Misc helpers                                                       */
/* ------------------------------------------------------------------ */

function limitInt(value, fallback) {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) {
    return Math.min(num, fallback);
  }
  return fallback;
}

function escapeLike(value) {
  return safeString(value).replace(/[%_\\]/g, '\\$&');
}

function escapeRegex(value) {
  return safeString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeString(value) {
  return (value ?? '').toString().trim();
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureSamplerOwnership(sample, user, res) {
  const userId = Number(user?.userId);
  const assignedSamplerId = Number(sample.assignedSampler);
  if (!assignedSamplerId) {
    res.status(409).json({ msg: 'Sample has not been assigned to a sampler yet.' });
    return false;
  }
  if (assignedSamplerId !== userId) {
    res.status(403).json({ msg: 'Sample is assigned to another sampler.' });
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*  serializeSample – reconstruct nested structure for frontend       */
/* ------------------------------------------------------------------ */

function serializeSample(source) {
  if (!source) return null;

  const raw = source.get ? source.get({ plain: true }) : source;

  // Separate attachment rows by type
  const allAttachments = Array.isArray(raw.attachments) ? raw.attachments : [];
  const mainAttachments = allAttachments.filter((a) => a.attachmentType === 'main');
  const collectionAttachments = allAttachments.filter((a) => a.attachmentType === 'collection');
  const labAttachments = allAttachments.filter((a) => a.attachmentType === 'lab_analysis');

  // Reconstruct plan object for frontend
  let planField = raw.planId;
  if (raw.plan && typeof raw.plan === 'object') {
    const p = raw.plan;
    planField = {
      id: p.id,
      title: p.title,
      category: p.category,
      tehsil: p.tehsil,
      district: p.district,
      criticalFlag: p.criticalFlag,
      latestQualityStatus: {
        status: p.latestQualityStatusStatus,
        score: p.latestQualityStatusScore != null ? Number(p.latestQualityStatusScore) : null,
        label: p.latestQualityStatusLabel,
        updatedAt: p.latestQualityStatusUpdatedAt
      }
    };
  }

  // Reconstruct assignedSampler
  let samplerField = raw.assignedSampler || null;
  if (raw.sampler && typeof raw.sampler === 'object') {
    samplerField = {
      id: raw.sampler.id,
      name: raw.sampler.name,
      role: raw.sampler.role
    };
  }

  // Reconstruct creator
  let createdByField = raw.createdBy;
  if (raw.creator && typeof raw.creator === 'object') {
    createdByField = {
      id: raw.creator.id,
      name: raw.creator.name,
      role: raw.creator.role
    };
  }

  // Reconstruct analyst
  let analystField = raw.labAnalysisAnalyst;
  if (raw.analyst && typeof raw.analyst === 'object') {
    analystField = {
      id: raw.analyst.id,
      name: raw.analyst.name,
      role: raw.analyst.role
    };
  }

  const result = {
    id: raw.id,
    planId: raw.planId,
    plan: planField,
    planSnapshot: {
      planId: raw.planSnapshotPlanId,
      title: raw.planSnapshotTitle,
      category: raw.planSnapshotCategory,
      tehsil: raw.planSnapshotTehsil,
      district: raw.planSnapshotDistrict
    },
    status: raw.status,
    assignedSampler: samplerField,
    assignedSamplerName: raw.assignedSamplerName,
    assignedSamplerId: raw.assignedSampler || null,
    assignedAt: raw.assignedAt,
    collection: {
      collectedAt: raw.collectionCollectedAt,
      fieldNotes: raw.collectionFieldNotes,
      location: (raw.collectionLocationLat != null && raw.collectionLocationLng != null)
        ? { lat: Number(raw.collectionLocationLat), lng: Number(raw.collectionLocationLng) }
        : null,
      collectedBy: raw.collectionCollectedBy,
      collectedByName: raw.collectionCollectedByName,
      attachments: decorateAttachmentList(collectionAttachments)
    },
    labAnalysis: {
      receivedAt: raw.labAnalysisReceivedAt,
      completedAt: raw.labAnalysisCompletedAt,
      analyst: analystField,
      analystName: raw.labAnalysisAnalystName,
      metrics: raw.labAnalysisMetrics,
      notes: raw.labAnalysisNotes,
      attachments: decorateAttachmentList(labAttachments)
    },
    computedScore: {
      indexName: raw.computedScoreIndexName,
      value: raw.computedScoreValue != null ? Number(raw.computedScoreValue) : null,
      rating: raw.computedScoreRating,
      updatedAt: raw.computedScoreUpdatedAt
    },
    statusHistory: Array.isArray(raw.statusHistory) ? raw.statusHistory.map((event) => ({
      id: event.id,
      code: event.code,
      label: event.label,
      note: event.note,
      tone: event.tone,
      createdAt: event.createdAt,
      createdBy: event.createdBy,
      createdByName: event.createdByName
    })) : [],
    attachments: decorateAttachmentList(mainAttachments),
    createdBy: createdByField,
    createdByName: raw.createdByName,
    updatedBy: raw.updatedBy,
    updatedByName: raw.updatedByName,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  };

  return result;
}

/* ------------------------------------------------------------------ */
/*  Error handler                                                      */
/* ------------------------------------------------------------------ */

function handleRouteError(res, err, fallback = 'Server error') {
  if (err?.statusCode && err.statusCode !== 500) {
    return res.status(err.statusCode).json({ msg: err.message || fallback });
  }
  return res.status(500).json({ msg: fallback, error: err?.message });
}

module.exports = router;
