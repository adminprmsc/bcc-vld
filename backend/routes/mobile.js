const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const path = require('path');
const multer = require('multer');

const auth = require('../middleware/auth');
const {
  Requisition, RequisitionActivityLog, RequisitionProgressUpdate,
  ConsultantPlan, ConsultantPlanMaintenanceRecord,
  WaterQualitySample, WaterQualitySampleStatusHistory, WaterQualitySampleAttachment,
  User, sequelize
} = require('../models-sql');
const { body, validationResult } = require('express-validator');

// Mobile-specific upload configuration
const MOBILE_UPLOAD_DIR = path.join(__dirname, '../uploads/mobile');
const fs = require('fs');
if (!fs.existsSync(MOBILE_UPLOAD_DIR)) {
  fs.mkdirSync(MOBILE_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MOBILE_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, `mobile-${timestamp}-${random}${ext}`);
  }
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
}).array('attachments', 10);

// Auth required for all mobile routes
router.use(auth);

/**
 * GET /mobile/dashboard
 * Returns dashboard snapshot for mobile app
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || '';

    // Get counts
    const [requisitionCount, assetCount, pendingTasks] = await Promise.all([
      Requisition.count(),
      ConsultantPlan.count(),
      getTaskCount(userId, userRole)
    ]);

    // Get recent activity
    const recentRequisitions = await Requisition.findAll({
      attributes: ['id', 'title', 'status', 'tehsil', 'dateCreated'],
      order: [['dateCreated', 'DESC']],
      limit: 5
    });

    res.json({
      metrics: [
        { id: 'requisitions', label: 'Requisitions', value: requisitionCount, tone: 'primary' },
        { id: 'assets', label: 'Assets', value: assetCount, tone: 'success' },
        { id: 'tasks', label: 'Pending Tasks', value: pendingTasks, tone: pendingTasks > 0 ? 'warning' : 'neutral' }
      ],
      recentActivity: recentRequisitions.map(r => ({
        id: r.id,
        title: r.title,
        status: r.status,
        tehsil: r.tehsil,
        date: r.dateCreated
      })),
      lastSync: new Date().toISOString()
    });
  } catch (err) {
    console.error('Mobile dashboard error:', err);
    res.status(500).json({ msg: 'Failed to load dashboard' });
  }
});

/**
 * GET /mobile/tasks
 * Returns tasks assigned to current user
 */
router.get('/tasks', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || '';

    const tasks = await getTasks(userId, userRole);
    res.json(tasks);
  } catch (err) {
    console.error('Mobile tasks error:', err);
    res.status(500).json({ msg: 'Failed to load tasks' });
  }
});

/**
 * POST /mobile/tasks/:id/complete
 * Mark a task as complete
 */
router.post('/tasks/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, status } = req.body;

    // Determine task type and update accordingly
    // Tasks can be requisition-related, maintenance, or water quality

    // Try to find as water quality sample first
    const sample = await WaterQualitySample.findByPk(id);
    if (sample) {
      await WaterQualitySampleStatusHistory.create({
        sampleId: sample.id,
        code: 'closed',
        label: 'Task completed via mobile',
        note: notes || '',
        tone: 'success',
        createdBy: req.user?.id,
        createdByName: req.user?.name || ''
      });
      sample.status = status || 'closed';
      sample.updatedBy = req.user?.id;
      sample.updatedByName = req.user?.name || '';
      await sample.save();
      return res.json({ success: true, type: 'water-quality' });
    }

    // Try maintenance task on consultant plan
    const plan = await ConsultantPlan.findByPk(id);
    if (plan) {
      await ConsultantPlanMaintenanceRecord.create({
        consultantPlanId: plan.id,
        performedAt: new Date(),
        type: 'inspection',
        status: 'completed',
        description: notes || 'Completed via mobile app',
        recordedBy: req.user?.id,
        recordedByName: req.user?.name || ''
      });
      plan.updatedBy = req.user?.id;
      await plan.save();
      return res.json({ success: true, type: 'maintenance' });
    }

    res.status(404).json({ msg: 'Task not found' });
  } catch (err) {
    console.error('Task complete error:', err);
    res.status(500).json({ msg: 'Failed to complete task' });
  }
});

/**
 * GET /mobile/sync
 * Returns sync status for offline queue
 */
router.get('/sync', async (req, res) => {
  try {
    res.json([
      { id: 'requisitions', name: 'Requisitions', status: 'synced', lastSync: new Date().toISOString() },
      { id: 'assets', name: 'Assets', status: 'synced', lastSync: new Date().toISOString() },
      { id: 'tasks', name: 'Tasks', status: 'synced', lastSync: new Date().toISOString() }
    ]);
  } catch (err) {
    res.status(500).json({ msg: 'Sync status unavailable' });
  }
});

/**
 * POST /mobile/sync/:channel/retry
 * Retry failed sync for a channel
 */
router.post('/sync/:channel/retry', async (req, res) => {
  // In a real implementation, this would retry failed uploads
  res.json({ success: true });
});

/**
 * GET /mobile/map-overlays
 * Returns GeoJSON features for map display
 */
router.get('/map-overlays', async (req, res) => {
  try {
    const plans = await ConsultantPlan.findAll({
      attributes: ['id', 'title', 'category', 'tehsil', 'featureGeometry', 'criticalFlag', 'latestQualityStatusStatus'],
      limit: 500
    });

    const features = plans
      .filter(p => p.featureGeometry)
      .map(p => ({
        type: 'Feature',
        id: String(p.id),
        geometry: p.featureGeometry,
        properties: {
          title: p.title,
          category: p.category,
          tehsil: p.tehsil,
          critical: p.criticalFlag || false,
          qualityStatus: p.latestQualityStatusStatus || 'unknown'
        }
      }));

    res.json({
      type: 'FeatureCollection',
      features
    });
  } catch (err) {
    console.error('Map overlays error:', err);
    res.status(500).json({ msg: 'Failed to load map data' });
  }
});

/**
 * POST /mobile/forms/requisition
 * Submit a new requisition from mobile form
 */
router.post('/forms/requisition', [
  body('title').notEmpty().trim(),
  body('purpose').notEmpty().trim(),
  body('tehsil').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      title, purpose, tehsil, district, description,
      landArea, landType, priority,
      location, mapMarker, offlineId
    } = req.body;

    const requisition = await Requisition.create({
      title,
      purpose,
      tehsil,
      district: district || '',
      description: description || '',
      landArea: landArea || '',
      landType: landType || '',
      priority: priority || 'Medium',
      locationAddress: location?.address || '',
      locationLat: location?.lat || null,
      locationLng: location?.lng || null,
      mapMarkerLat: mapMarker?.lat || null,
      mapMarkerLng: mapMarker?.lng || null,
      requestedBy: req.user?.id,
      status: 'Pending'
    });

    // Create activity log entry
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Created via mobile app',
      userId: req.user?.id,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      id: requisition.id,
      sequenceNumber: requisition.sequenceNumber,
      offlineId // Return for client-side mapping
    });
  } catch (err) {
    console.error('Mobile requisition create error:', err);
    res.status(500).json({ msg: 'Failed to create requisition' });
  }
});

/**
 * POST /mobile/forms/requisition/:id/attachments
 * Upload attachments for a requisition
 */
router.post('/forms/requisition/:id/attachments', (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ msg: err.message });
    }

    try {
      const requisition = await Requisition.findByPk(req.params.id);
      if (!requisition) {
        return res.status(404).json({ msg: 'Requisition not found' });
      }

      const uploaded = (req.files || []).map(f => `/uploads/mobile/${f.filename}`);
      requisition.attachments = [...(requisition.attachments || []), ...uploaded];
      requisition.lastUpdated = new Date();
      await requisition.save();

      res.json({ success: true, attachments: uploaded });
    } catch (err) {
      console.error('Attachment upload error:', err);
      res.status(500).json({ msg: 'Failed to upload attachments' });
    }
  });
});

/**
 * POST /mobile/forms/maintenance
 * Submit maintenance record from mobile
 */
router.post('/forms/maintenance', [
  body('planId').notEmpty(),
  body('type').isIn(['preventive', 'corrective', 'emergency', 'inspection']),
  body('description').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { planId, type, description, cost, notes, performedAt, offlineId } = req.body;

    const plan = await ConsultantPlan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ msg: 'Asset not found' });
    }

    const record = await ConsultantPlanMaintenanceRecord.create({
      consultantPlanId: plan.id,
      performedAt: performedAt ? new Date(performedAt) : new Date(),
      type,
      status: 'completed',
      description,
      cost: cost || 0,
      notes: notes || '',
      recordedBy: req.user?.id,
      recordedByName: req.user?.name || ''
    });

    plan.updatedBy = req.user?.id;
    await plan.save();

    res.status(201).json({
      success: true,
      recordId: record.id,
      offlineId
    });
  } catch (err) {
    console.error('Mobile maintenance error:', err);
    res.status(500).json({ msg: 'Failed to record maintenance' });
  }
});

/**
 * POST /mobile/forms/water-sample-collection
 * Submit water sample collection data from field
 */
router.post('/forms/water-sample-collection', [
  body('sampleId').notEmpty(),
  body('collectedAt').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { sampleId, collectedAt, fieldNotes, location, offlineId } = req.body;

    const sample = await WaterQualitySample.findByPk(sampleId);
    if (!sample) {
      return res.status(404).json({ msg: 'Sample not found' });
    }

    // Set flattened collection fields
    sample.collectionCollectedAt = new Date(collectedAt);
    sample.collectionFieldNotes = fieldNotes || '';
    sample.collectionLocationLat = location?.lat || null;
    sample.collectionLocationLng = location?.lng || null;
    sample.collectionCollectedBy = req.user?.id;
    sample.collectionCollectedByName = req.user?.name || '';

    sample.status = 'in_lab';
    sample.updatedBy = req.user?.id;
    sample.updatedByName = req.user?.name || '';
    await sample.save();

    // Create status history entry
    await WaterQualitySampleStatusHistory.create({
      sampleId: sample.id,
      code: 'collection_complete',
      label: 'Sample collected in field',
      note: fieldNotes || '',
      tone: 'success',
      createdBy: req.user?.id,
      createdByName: req.user?.name || ''
    });

    res.json({
      success: true,
      status: sample.status,
      offlineId
    });
  } catch (err) {
    console.error('Sample collection error:', err);
    res.status(500).json({ msg: 'Failed to submit collection data' });
  }
});

/**
 * POST /mobile/forms/water-sample-collection/:id/attachments
 * Upload photos for water sample collection
 */
router.post('/forms/water-sample-collection/:id/attachments', (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ msg: err.message });
    }

    try {
      const sample = await WaterQualitySample.findByPk(req.params.id);
      if (!sample) {
        return res.status(404).json({ msg: 'Sample not found' });
      }

      const uploaded = [];
      for (const f of (req.files || [])) {
        const attachment = await WaterQualitySampleAttachment.create({
          sampleId: sample.id,
          attachmentType: 'collection',
          storedName: f.filename,
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size
        });
        uploaded.push({
          id: attachment.id,
          storedName: f.filename,
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size
        });
      }

      sample.updatedBy = req.user?.id;
      await sample.save();

      res.json({ success: true, attachments: uploaded });
    } catch (err) {
      console.error('Sample attachment error:', err);
      res.status(500).json({ msg: 'Failed to upload attachments' });
    }
  });
});

// Helper functions
async function getTaskCount(userId, role) {
  let count = 0;

  // Count assigned water quality samples
  if (['PCRWR Sampler', 'PCRWR Lab'].includes(role)) {
    count += await WaterQualitySample.count({
      where: {
        [Op.or]: [
          { assignedSampler: userId },
          { labAnalysisAnalyst: userId }
        ],
        status: { [Op.notIn]: ['closed', 'cancelled'] }
      }
    });
  }

  // Count assets needing maintenance for Tehsil Manager
  if (role === 'Tehsil Manager') {
    count += await ConsultantPlan.count({
      where: {
        maintenanceOwner: userId,
        criticalFlag: true
      }
    });
  }

  return count;
}

async function getTasks(userId, role) {
  const tasks = [];

  // Water quality tasks for PCRWR roles
  if (['PCRWR Sampler', 'PCRWR Lab', 'RA Environment'].includes(role)) {
    const samples = await WaterQualitySample.findAll({
      where: {
        [Op.or]: [
          { assignedSampler: userId },
          { labAnalysisAnalyst: userId },
          { createdBy: userId }
        ],
        status: { [Op.notIn]: ['closed', 'cancelled'] }
      },
      include: [{
        model: ConsultantPlan,
        as: 'plan',
        attributes: ['id', 'title', 'tehsil']
      }],
      limit: 50
    });

    samples.forEach(s => {
      tasks.push({
        id: s.id,
        title: `Water Sample: ${s.planSnapshotTitle || s.plan?.title || 'Unknown'}`,
        type: 'water-quality',
        status: mapSampleStatus(s.status),
        priority: s.status === 'awaiting_collection' ? 'high' : 'medium',
        dueDate: null,
        location: s.planSnapshotTehsil || s.plan?.tehsil || ''
      });
    });
  }

  // Maintenance tasks for Tehsil Manager
  if (role === 'Tehsil Manager') {
    const plans = await ConsultantPlan.findAll({
      where: {
        [Op.or]: [
          { maintenanceOwner: userId },
          { criticalFlag: true }
        ]
      },
      attributes: ['id', 'title', 'tehsil', 'criticalFlag', 'criticalReason'],
      limit: 50
    });

    plans.forEach(p => {
      if (p.criticalFlag) {
        tasks.push({
          id: p.id,
          title: `Critical Asset: ${p.title}`,
          type: 'maintenance',
          status: 'pending',
          priority: 'high',
          dueDate: null,
          location: p.tehsil || '',
          note: p.criticalReason || ''
        });
      }
    });
  }

  return tasks;
}

function mapSampleStatus(status) {
  const map = {
    'awaiting_assignment': 'pending',
    'awaiting_collection': 'pending',
    'collecting': 'in-progress',
    'in_lab': 'in-progress',
    'results_ready': 'review',
    'closed': 'completed',
    'cancelled': 'cancelled'
  };
  return map[status] || 'pending';
}

// ============================================
// LAND UTILIZATION PROGRESS FORMS (DM Role)
// ============================================

/**
 * POST /mobile/forms/land-utilization-progress
 * Submit land utilization progress update from field
 */
router.post('/forms/land-utilization-progress', [
  body('requisitionId').notEmpty().trim(),
  body('progressStatus').notEmpty(),
  body('progressPercentage').isNumeric(),
  body('description').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      requisitionId, progressStatus, progressPercentage, workType,
      description, challenges, nextSteps, location, capturedAt, offlineId
    } = req.body;

    // Find the requisition
    const requisition = await Requisition.findByPk(requisitionId);
    if (!requisition) {
      return res.status(404).json({ msg: 'Requisition not found' });
    }

    // Create activity log entry for progress update
    await RequisitionActivityLog.create({
      requisitionId: requisition.id,
      action: 'Progress Update',
      userId: req.user?.id,
      timestamp: capturedAt ? new Date(capturedAt) : new Date(),
      meta: {
        status: progressStatus,
        percentage: progressPercentage,
        workType: workType || '',
        description,
        challenges: challenges || '',
        nextSteps: nextSteps || '',
        location: location || null,
        submittedVia: 'mobile'
      }
    });

    // Create a progress update record
    await RequisitionProgressUpdate.create({
      requisitionId: requisition.id,
      status: progressStatus,
      description,
      progressDate: capturedAt ? new Date(capturedAt) : new Date(),
      completionPercentage: progressPercentage,
      updatedBy: req.user?.id
    });

    // Update land utilization flattened fields
    requisition.landUtilizationPhase = progressStatus;
    requisition.landUtilizationSummary = description;
    requisition.landUtilizationNextMilestone = nextSteps || '';
    requisition.landUtilizationUpdatedBy = req.user?.id;
    requisition.landUtilizationUpdatedAt = new Date();

    requisition.lastUpdated = new Date();
    await requisition.save();

    res.status(201).json({
      success: true,
      requisitionId: requisition.id,
      offlineId
    });
  } catch (err) {
    console.error('Land utilization progress error:', err);
    res.status(500).json({ msg: 'Failed to submit progress update' });
  }
});

// ============================================
// REDBOOK OPERATIONAL DATA FORMS (DM Role)
// ============================================

/**
 * POST /mobile/forms/redbook-operational
 * Submit Redbook operational data from field
 */
router.post('/forms/redbook-operational', [
  body('assetId').notEmpty().trim(),
  body('assetType').notEmpty(),
  body('operationalStatus').notEmpty(),
  body('condition').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      assetId, assetType, operationalStatus, capacityUtilization,
      lastMaintenanceDate, nextMaintenanceDue, condition,
      operator, remarks, issues, location, capturedAt, offlineId
    } = req.body;

    // Find the asset (ConsultantPlan) by PK or by title
    let asset = await ConsultantPlan.findByPk(assetId);

    if (!asset) {
      // Try finding by title
      asset = await ConsultantPlan.findOne({ where: { title: assetId } });
    }

    if (!asset) {
      return res.status(404).json({ msg: 'Asset not found' });
    }

    // Create operational record in attributes JSON
    const operationalRecord = {
      recordedAt: capturedAt ? new Date(capturedAt) : new Date(),
      recordedBy: req.user?.id,
      recordedByName: req.user?.name || '',
      assetType,
      operationalStatus,
      capacityUtilization: capacityUtilization || null,
      condition,
      operator: operator || {},
      remarks: remarks || '',
      issues: issues || [],
      location: location || null,
      submittedVia: 'mobile'
    };

    // Update attributes JSON field (add to redbookRecords array)
    const attrs = asset.attributes ? { ...asset.attributes } : {};
    if (!attrs.redbookRecords) {
      attrs.redbookRecords = [];
    }
    attrs.redbookRecords.push(operationalRecord);

    // Update asset status within attributes
    attrs.operationalStatus = operationalStatus;
    attrs.condition = condition;
    attrs.lastRedbookUpdate = new Date();

    asset.attributes = attrs;

    // Update critical flag if condition is poor/critical
    if (['poor', 'critical'].includes(condition)) {
      asset.criticalFlag = true;
      asset.criticalReason = `Condition: ${condition}. Issues: ${issues?.length || 0}`;
    }

    // Add maintenance record if nextMaintenanceDue is provided
    if (nextMaintenanceDue) {
      await ConsultantPlanMaintenanceRecord.create({
        consultantPlanId: asset.id,
        performedAt: capturedAt ? new Date(capturedAt) : new Date(),
        type: 'inspection',
        status: 'completed',
        description: `Redbook inspection: ${condition}`,
        recordedBy: req.user?.id,
        recordedByName: req.user?.name || ''
      });
    }

    asset.updatedBy = req.user?.id;
    await asset.save();

    res.status(201).json({
      success: true,
      assetId: asset.id,
      offlineId
    });
  } catch (err) {
    console.error('Redbook operational error:', err);
    res.status(500).json({ msg: 'Failed to submit redbook data' });
  }
});

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * GET /mobile/notifications
 * Get user notifications
 */
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || '';

    // In a real implementation, fetch from a Notification collection
    // For now, generate notifications based on user's pending items
    const notifications = [];

    // Check for pending tasks
    if (['PCRWR Sampler', 'PCRWR Lab'].includes(userRole)) {
      const pendingSamples = await WaterQualitySample.count({
        where: {
          [Op.or]: [
            { assignedSampler: userId },
            { labAnalysisAnalyst: userId }
          ],
          status: { [Op.in]: ['awaiting_collection', 'awaiting_assignment'] }
        }
      });

      if (pendingSamples > 0) {
        notifications.push({
          id: `notif_samples_${Date.now()}`,
          title: 'Pending Sample Collections',
          body: `You have ${pendingSamples} sample(s) awaiting collection.`,
          type: 'sample',
          data: { count: pendingSamples },
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Check for critical assets
    if (['DM Tehsil', 'Tehsil Manager'].includes(userRole)) {
      const criticalAssets = await ConsultantPlan.count({
        where: { criticalFlag: true }
      });

      if (criticalAssets > 0) {
        notifications.push({
          id: `notif_critical_${Date.now()}`,
          title: 'Critical Assets Alert',
          body: `${criticalAssets} asset(s) require immediate attention.`,
          type: 'system',
          data: { count: criticalAssets },
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Add a welcome notification
    notifications.push({
      id: 'notif_welcome',
      title: 'Welcome to LDS Field Operations',
      body: 'You can submit forms, view tasks, and sync data from this app.',
      type: 'system',
      data: {},
      read: true,
      createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    });

    res.json({ notifications });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ msg: 'Failed to load notifications' });
  }
});

/**
 * POST /mobile/notifications/register
 * Register push notification token
 */
router.post('/notifications/register', async (req, res) => {
  try {
    const { token, platform, deviceName } = req.body;
    const userId = req.user?.id;

    // Update user with push token
    console.log(`Push token registered for user ${userId}: ${token} (${platform})`);

    await User.update(
      {
        pushToken: token,
        pushPlatform: platform,
        pushDeviceName: deviceName,
        pushTokenUpdatedAt: new Date()
      },
      { where: { id: userId } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Push token registration error:', err);
    res.status(500).json({ msg: 'Failed to register push token' });
  }
});

/**
 * POST /mobile/notifications/:id/read
 * Mark notification as read
 */
router.post('/notifications/:id/read', async (req, res) => {
  try {
    // In a real implementation, update notification in database
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to mark notification read' });
  }
});

module.exports = router;
