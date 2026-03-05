/**
 * MongoDB to MySQL Migration Script
 * Transfers all data from MongoDB collections to MySQL tables
 * 
 * Usage: node scripts/migrate-mongodb-to-mysql.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { sequelize, syncDatabase } = require('../config/database');

// Import MongoDB models
const MongoUser = require('../models/User');
const MongoRequisition = require('../models/Requisition');
const MongoConsultantPlan = require('../models/ConsultantPlan');
const MongoWaterQualitySample = require('../models/WaterQualitySample');
const MongoAccessRequest = require('../models/AccessRequest');
const MongoSupportRequest = require('../models/SupportRequest');

// Import MySQL models
const {
  User,
  Counter,
  Requisition,
  RequisitionActivityLog,
  RequisitionCivilStructure,
  RequisitionMachinery,
  RequisitionProgressUpdate,
  ConsultantPlan,
  ConsultantPlanAttachment,
  ConsultantPlanMaintenanceRecord,
  WaterQualitySample,
  WaterQualitySampleStatusHistory,
  WaterQualitySampleAttachment,
  AccessRequest,
  SupportRequest,
  SupportRequestUpdate,
  SupportRequestAttachment
} = require('../models-sql');

// ID mapping: MongoDB ObjectId -> MySQL BigInt
const idMaps = {
  users: new Map(),
  requisitions: new Map(),
  consultantPlans: new Map(),
  waterQualitySamples: new Map(),
  supportRequests: new Map()
};

// Stats tracking
const stats = {
  users: { total: 0, migrated: 0, failed: 0 },
  requisitions: { total: 0, migrated: 0, failed: 0 },
  activityLogs: { total: 0, migrated: 0, failed: 0 },
  civilStructures: { total: 0, migrated: 0, failed: 0 },
  machinery: { total: 0, migrated: 0, failed: 0 },
  progressUpdates: { total: 0, migrated: 0, failed: 0 },
  consultantPlans: { total: 0, migrated: 0, failed: 0 },
  planAttachments: { total: 0, migrated: 0, failed: 0 },
  maintenanceRecords: { total: 0, migrated: 0, failed: 0 },
  waterQualitySamples: { total: 0, migrated: 0, failed: 0 },
  sampleStatusHistory: { total: 0, migrated: 0, failed: 0 },
  sampleAttachments: { total: 0, migrated: 0, failed: 0 },
  accessRequests: { total: 0, migrated: 0, failed: 0 },
  supportRequests: { total: 0, migrated: 0, failed: 0 },
  supportUpdates: { total: 0, migrated: 0, failed: 0 },
  supportAttachments: { total: 0, migrated: 0, failed: 0 }
};

// Helper: Map MongoDB ObjectId to MySQL ID
function mapUserId(mongoId) {
  if (!mongoId) return null;
  const strId = mongoId.toString();
  return idMaps.users.get(strId) || null;
}

function mapRequisitionId(mongoId) {
  if (!mongoId) return null;
  const strId = mongoId.toString();
  return idMaps.requisitions.get(strId) || null;
}

function mapConsultantPlanId(mongoId) {
  if (!mongoId) return null;
  const strId = mongoId.toString();
  return idMaps.consultantPlans.get(strId) || null;
}

function mapSampleId(mongoId) {
  if (!mongoId) return null;
  const strId = mongoId.toString();
  return idMaps.waterQualitySamples.get(strId) || null;
}

function mapSupportRequestId(mongoId) {
  if (!mongoId) return null;
  const strId = mongoId.toString();
  return idMaps.supportRequests.get(strId) || null;
}

// ============================================
// MIGRATION FUNCTIONS
// ============================================

async function migrateUsers() {
  console.log('\n📦 Migrating Users...');
  const mongoUsers = await MongoUser.find({}).lean();
  stats.users.total = mongoUsers.length;
  
  for (const mongoUser of mongoUsers) {
    try {
      const mysqlUser = await User.create({
        simpleId: mongoUser.simpleId,
        name: mongoUser.name,
        email: mongoUser.email,
        password: mongoUser.password, // Already hashed
        role: mongoUser.role,
        gender: mongoUser.gender,
        cnic: mongoUser.cnic,
        cnicExpiry: mongoUser.cnicExpiry,
        address: mongoUser.address,
        dob: mongoUser.dob,
        phone: mongoUser.phone,
        activeStatus: mongoUser.activeStatus || 'inactive'
      }, { hooks: false }); // Skip hooks to preserve password
      
      idMaps.users.set(mongoUser._id.toString(), mysqlUser.id);
      stats.users.migrated++;
    } catch (error) {
      console.error(`  ❌ Failed to migrate user ${mongoUser.email}:`, error.message);
      stats.users.failed++;
    }
  }
  
  // Update counter for users
  const maxSimpleId = await User.max('simpleId') || 0;
  await Counter.upsert({ counterKey: 'user-simple-id', seq: maxSimpleId });
  
  console.log(`  ✅ Users: ${stats.users.migrated}/${stats.users.total} migrated`);
}

async function migrateRequisitions() {
  console.log('\n📦 Migrating Requisitions...');
  const mongoRequisitions = await MongoRequisition.find({}).lean();
  stats.requisitions.total = mongoRequisitions.length;
  
  for (const req of mongoRequisitions) {
    try {
      const mysqlReq = await Requisition.create({
        sequenceNumber: req.sequenceNumber,
        title: req.title,
        description: req.description,
        purpose: req.purpose,
        division: req.division || '',
        district: req.district || '',
        tehsil: req.tehsil,
        requestedBy: mapUserId(req.requestedBy),
        assignedTo: mapUserId(req.assignedTo),
        landArea: req.landArea,
        landType: req.landType,
        landBreadth: req.landBreadth || 0,
        landDepth: req.landDepth || 0,
        calculatedAreaSqFt: req.calculatedAreaSqFt || 0,
        calculatedAreaMarlas: req.calculatedAreaMarlas || 0,
        calculatedAreaKanals: req.calculatedAreaKanals || 0,
        locationAddress: req.location?.address,
        locationLat: req.location?.coordinates?.lat,
        locationLng: req.location?.coordinates?.lng,
        mapMarkerLat: req.mapMarker?.lat,
        mapMarkerLng: req.mapMarker?.lng,
        mapViewportCenterLat: req.mapViewport?.center?.lat,
        mapViewportCenterLng: req.mapViewport?.center?.lng,
        mapViewportZoom: req.mapViewport?.zoom || 0,
        govtLandChecklist: req.govtLandChecklist,
        privateLandChecklist: req.privateLandChecklist,
        mapFeatures: req.mapFeatures,
        landAcquisitionType: req.landAcquisition?.type,
        landAcquisitionStatus: req.landAcquisition?.status || '',
        landAcquisitionData: req.landAcquisition,
        landAcquisitionUpdatedBy: mapUserId(req.landAcquisition?.updatedBy),
        landAcquisitionUpdatedAt: req.landAcquisition?.updatedAt,
        landUtilizationPhase: req.landUtilization?.phase,
        landUtilizationSummary: req.landUtilization?.summary,
        landUtilizationNextMilestone: req.landUtilization?.nextMilestone,
        landUtilizationGallery: req.landUtilization?.gallery,
        landUtilizationUpdatedBy: mapUserId(req.landUtilization?.updatedBy),
        landUtilizationUpdatedAt: req.landUtilization?.updatedAt,
        requiredDate: req.requiredDate,
        priority: req.priority || 'Medium',
        supportingDocs: req.supportingDocs,
        status: req.status || 'Pending',
        estimatedValue: req.estimatedValue,
        remarks: req.remarks,
        attachments: req.attachments,
        dateCreated: req.dateCreated || req.createdAt,
        lastUpdated: req.lastUpdated || req.updatedAt
      });
      
      idMaps.requisitions.set(req._id.toString(), mysqlReq.id);
      stats.requisitions.migrated++;
      
      // Migrate embedded arrays
      await migrateRequisitionActivityLogs(req, mysqlReq.id);
      await migrateRequisitionCivilStructures(req, mysqlReq.id);
      await migrateRequisitionMachinery(req, mysqlReq.id);
      await migrateRequisitionProgressUpdates(req, mysqlReq.id);
      
    } catch (error) {
      console.error(`  ❌ Failed to migrate requisition ${req.title}:`, error.message);
      stats.requisitions.failed++;
    }
  }
  
  // Update counter
  const maxSeq = await Requisition.max('sequenceNumber') || 0;
  await Counter.upsert({ counterKey: 'requisition-sequence', seq: maxSeq });
  
  console.log(`  ✅ Requisitions: ${stats.requisitions.migrated}/${stats.requisitions.total} migrated`);
}

async function migrateRequisitionActivityLogs(mongoReq, mysqlReqId) {
  if (!mongoReq.activityLog || !mongoReq.activityLog.length) return;
  
  stats.activityLogs.total += mongoReq.activityLog.length;
  
  for (const log of mongoReq.activityLog) {
    try {
      await RequisitionActivityLog.create({
        requisitionId: mysqlReqId,
        action: log.action,
        userId: mapUserId(log.user),
        timestamp: log.timestamp,
        remarks: log.remarks,
        meta: log.meta
      });
      stats.activityLogs.migrated++;
    } catch (error) {
      stats.activityLogs.failed++;
    }
  }
}

async function migrateRequisitionCivilStructures(mongoReq, mysqlReqId) {
  if (!mongoReq.landUtilization?.civilStructures?.length) return;
  
  stats.civilStructures.total += mongoReq.landUtilization.civilStructures.length;
  
  for (const structure of mongoReq.landUtilization.civilStructures) {
    try {
      await RequisitionCivilStructure.create({
        requisitionId: mysqlReqId,
        name: structure.name,
        category: structure.category,
        status: structure.status || 'Planned',
        description: structure.description,
        attributes: structure.attributes,
        photos: structure.photos,
        updatedBy: mapUserId(structure.updatedBy)
      });
      stats.civilStructures.migrated++;
    } catch (error) {
      stats.civilStructures.failed++;
    }
  }
}

async function migrateRequisitionMachinery(mongoReq, mysqlReqId) {
  if (!mongoReq.landUtilization?.machinery?.length) return;
  
  stats.machinery.total += mongoReq.landUtilization.machinery.length;
  
  for (const machine of mongoReq.landUtilization.machinery) {
    try {
      await RequisitionMachinery.create({
        requisitionId: mysqlReqId,
        name: machine.name,
        type: machine.type,
        status: machine.status || 'Idle',
        capacity: machine.capacity,
        manufacturer: machine.manufacturer,
        attributes: machine.attributes,
        photos: machine.photos,
        updatedBy: mapUserId(machine.updatedBy)
      });
      stats.machinery.migrated++;
    } catch (error) {
      stats.machinery.failed++;
    }
  }
}

async function migrateRequisitionProgressUpdates(mongoReq, mysqlReqId) {
  if (!mongoReq.landUtilization?.progressUpdates?.length) return;
  
  stats.progressUpdates.total += mongoReq.landUtilization.progressUpdates.length;
  
  for (const update of mongoReq.landUtilization.progressUpdates) {
    try {
      await RequisitionProgressUpdate.create({
        requisitionId: mysqlReqId,
        status: update.status,
        description: update.description,
        progressDate: update.progressDate || update.createdAt,
        completionPercentage: update.completionPercentage,
        attachments: update.attachments,
        updatedBy: mapUserId(update.updatedBy)
      });
      stats.progressUpdates.migrated++;
    } catch (error) {
      stats.progressUpdates.failed++;
    }
  }
}

async function migrateConsultantPlans() {
  console.log('\n📦 Migrating Consultant Plans...');
  const mongoPlans = await MongoConsultantPlan.find({}).lean();
  stats.consultantPlans.total = mongoPlans.length;
  
  for (const plan of mongoPlans) {
    try {
      const mysqlPlan = await ConsultantPlan.create({
        title: plan.title,
        assetType: plan.assetType,
        assetLabel: plan.assetLabel,
        category: plan.category,
        layerName: plan.layerName || 'PRMSC Red Book Assets',
        description: plan.description,
        requisitionId: mapRequisitionId(plan.requisitionId),
        tehsil: plan.tehsil || '',
        district: plan.district || '',
        featureType: plan.feature?.type || 'Feature',
        featureGeometry: plan.feature?.geometry,
        featureProperties: plan.feature?.properties,
        attributes: plan.attributes,
        criticalFlag: plan.criticalFlag || false,
        criticalReason: plan.criticalReason,
        criticalMarkedAt: plan.criticalMarkedAt,
        criticalMarkedBy: mapUserId(plan.criticalMarkedBy),
        criticalMarkedByName: plan.criticalMarkedByName,
        criticalAcknowledgedAt: plan.criticalAcknowledgedAt,
        criticalAcknowledgedBy: mapUserId(plan.criticalAcknowledgedBy),
        criticalAcknowledgedByName: plan.criticalAcknowledgedByName,
        latestQualityStatusStatus: plan.latestQualityStatus?.status || 'normal',
        latestQualityStatusScore: plan.latestQualityStatus?.score,
        latestQualityStatusLabel: plan.latestQualityStatus?.label || 'Normal',
        latestQualityStatusUpdatedAt: plan.latestQualityStatus?.updatedAt,
        maintenanceOwnerRole: plan.maintenanceOwnerRole || 'Tehsil Manager',
        maintenanceOwner: mapUserId(plan.maintenanceOwner),
        maintenanceOwnerName: plan.maintenanceOwnerName,
        createdBy: mapUserId(plan.createdBy) || 1, // Default to first user
        updatedBy: mapUserId(plan.updatedBy)
      });
      
      idMaps.consultantPlans.set(plan._id.toString(), mysqlPlan.id);
      stats.consultantPlans.migrated++;
      
      // Migrate attachments and maintenance records
      await migratePlanAttachments(plan, mysqlPlan.id);
      await migratePlanMaintenanceRecords(plan, mysqlPlan.id);
      
    } catch (error) {
      console.error(`  ❌ Failed to migrate plan ${plan.title}:`, error.message);
      stats.consultantPlans.failed++;
    }
  }
  
  console.log(`  ✅ Consultant Plans: ${stats.consultantPlans.migrated}/${stats.consultantPlans.total} migrated`);
}

async function migratePlanAttachments(mongoPlan, mysqlPlanId) {
  if (!mongoPlan.attachments?.length) return;
  
  stats.planAttachments.total += mongoPlan.attachments.length;
  
  for (const attachment of mongoPlan.attachments) {
    try {
      await ConsultantPlanAttachment.create({
        consultantPlanId: mysqlPlanId,
        storedName: attachment.storedName,
        originalName: attachment.originalName || '',
        mimeType: attachment.mimeType || '',
        size: attachment.size || 0
      });
      stats.planAttachments.migrated++;
    } catch (error) {
      stats.planAttachments.failed++;
    }
  }
}

async function migratePlanMaintenanceRecords(mongoPlan, mysqlPlanId) {
  if (!mongoPlan.maintenanceRecords?.length) return;
  
  stats.maintenanceRecords.total += mongoPlan.maintenanceRecords.length;
  
  for (const record of mongoPlan.maintenanceRecords) {
    try {
      await ConsultantPlanMaintenanceRecord.create({
        consultantPlanId: mysqlPlanId,
        performedAt: record.performedAt,
        type: record.type || 'preventive',
        status: record.status || 'completed',
        description: record.description,
        cost: record.cost || 0,
        notes: record.notes,
        recordedBy: mapUserId(record.recordedBy),
        recordedByName: record.recordedByName
      });
      stats.maintenanceRecords.migrated++;
    } catch (error) {
      stats.maintenanceRecords.failed++;
    }
  }
}

async function migrateWaterQualitySamples() {
  console.log('\n📦 Migrating Water Quality Samples...');
  const mongoSamples = await MongoWaterQualitySample.find({}).lean();
  stats.waterQualitySamples.total = mongoSamples.length;
  
  for (const sample of mongoSamples) {
    try {
      const mysqlSample = await WaterQualitySample.create({
        planId: mapConsultantPlanId(sample.planId) || 1,
        planSnapshotPlanId: sample.planSnapshot?.planId ? mapConsultantPlanId(sample.planSnapshot.planId) : mapConsultantPlanId(sample.planId) || 1,
        planSnapshotTitle: sample.planSnapshot?.title || '',
        planSnapshotCategory: sample.planSnapshot?.category || '',
        planSnapshotTehsil: sample.planSnapshot?.tehsil || '',
        planSnapshotDistrict: sample.planSnapshot?.district || '',
        status: sample.status || 'awaiting_assignment',
        assignedSampler: mapUserId(sample.assignedSampler),
        assignedSamplerName: sample.assignedSamplerName,
        assignedAt: sample.assignedAt,
        collectionCollectedAt: sample.collection?.collectedAt,
        collectionFieldNotes: sample.collection?.fieldNotes,
        collectionLocationLat: sample.collection?.location?.lat,
        collectionLocationLng: sample.collection?.location?.lng,
        collectionCollectedBy: mapUserId(sample.collection?.collectedBy),
        collectionCollectedByName: sample.collection?.collectedByName,
        labAnalysisReceivedAt: sample.labAnalysis?.receivedAt,
        labAnalysisCompletedAt: sample.labAnalysis?.completedAt,
        labAnalysisAnalyst: mapUserId(sample.labAnalysis?.analyst),
        labAnalysisAnalystName: sample.labAnalysis?.analystName,
        labAnalysisMetrics: sample.labAnalysis?.metrics,
        labAnalysisNotes: sample.labAnalysis?.notes,
        computedScoreIndexName: sample.computedScore?.indexName || 'potability-index',
        computedScoreValue: sample.computedScore?.value,
        computedScoreRating: sample.computedScore?.rating || 'pending',
        computedScoreUpdatedAt: sample.computedScore?.updatedAt,
        createdBy: mapUserId(sample.createdBy) || 1,
        createdByName: sample.createdByName,
        updatedBy: mapUserId(sample.updatedBy),
        updatedByName: sample.updatedByName
      });
      
      idMaps.waterQualitySamples.set(sample._id.toString(), mysqlSample.id);
      stats.waterQualitySamples.migrated++;
      
      // Migrate status history and attachments
      await migrateSampleStatusHistory(sample, mysqlSample.id);
      await migrateSampleAttachments(sample, mysqlSample.id);
      
    } catch (error) {
      console.error(`  ❌ Failed to migrate sample:`, error.message);
      stats.waterQualitySamples.failed++;
    }
  }
  
  console.log(`  ✅ Water Quality Samples: ${stats.waterQualitySamples.migrated}/${stats.waterQualitySamples.total} migrated`);
}

async function migrateSampleStatusHistory(mongoSample, mysqlSampleId) {
  if (!mongoSample.statusHistory?.length) return;
  
  stats.sampleStatusHistory.total += mongoSample.statusHistory.length;
  
  for (const event of mongoSample.statusHistory) {
    try {
      await WaterQualitySampleStatusHistory.create({
        sampleId: mysqlSampleId,
        code: event.code,
        label: event.label,
        note: event.note,
        tone: event.tone || 'info',
        createdBy: mapUserId(event.createdBy) || 1,
        createdByName: event.createdByName
      });
      stats.sampleStatusHistory.migrated++;
    } catch (error) {
      stats.sampleStatusHistory.failed++;
    }
  }
}

async function migrateSampleAttachments(mongoSample, mysqlSampleId) {
  // Main attachments
  if (mongoSample.attachments?.length) {
    stats.sampleAttachments.total += mongoSample.attachments.length;
    for (const att of mongoSample.attachments) {
      try {
        await WaterQualitySampleAttachment.create({
          sampleId: mysqlSampleId,
          attachmentType: 'main',
          storedName: att.storedName,
          originalName: att.originalName || '',
          mimeType: att.mimeType || '',
          size: att.size || 0
        });
        stats.sampleAttachments.migrated++;
      } catch (error) {
        stats.sampleAttachments.failed++;
      }
    }
  }
  
  // Collection attachments
  if (mongoSample.collection?.attachments?.length) {
    stats.sampleAttachments.total += mongoSample.collection.attachments.length;
    for (const att of mongoSample.collection.attachments) {
      try {
        await WaterQualitySampleAttachment.create({
          sampleId: mysqlSampleId,
          attachmentType: 'collection',
          storedName: att.storedName,
          originalName: att.originalName || '',
          mimeType: att.mimeType || '',
          size: att.size || 0
        });
        stats.sampleAttachments.migrated++;
      } catch (error) {
        stats.sampleAttachments.failed++;
      }
    }
  }
  
  // Lab analysis attachments
  if (mongoSample.labAnalysis?.attachments?.length) {
    stats.sampleAttachments.total += mongoSample.labAnalysis.attachments.length;
    for (const att of mongoSample.labAnalysis.attachments) {
      try {
        await WaterQualitySampleAttachment.create({
          sampleId: mysqlSampleId,
          attachmentType: 'lab_analysis',
          storedName: att.storedName,
          originalName: att.originalName || '',
          mimeType: att.mimeType || '',
          size: att.size || 0
        });
        stats.sampleAttachments.migrated++;
      } catch (error) {
        stats.sampleAttachments.failed++;
      }
    }
  }
}

async function migrateAccessRequests() {
  console.log('\n📦 Migrating Access Requests...');
  const mongoRequests = await MongoAccessRequest.find({}).lean();
  stats.accessRequests.total = mongoRequests.length;
  
  for (const req of mongoRequests) {
    try {
      await AccessRequest.create({
        name: req.name,
        email: req.email,
        phone: req.phone,
        roleRequested: req.roleRequested,
        tehsil: req.tehsil,
        message: req.message,
        status: req.status || 'Pending',
        processedBy: mapUserId(req.processedBy),
        processedAt: req.processedAt,
        processedNotes: req.processedNotes
      });
      stats.accessRequests.migrated++;
    } catch (error) {
      console.error(`  ❌ Failed to migrate access request ${req.email}:`, error.message);
      stats.accessRequests.failed++;
    }
  }
  
  console.log(`  ✅ Access Requests: ${stats.accessRequests.migrated}/${stats.accessRequests.total} migrated`);
}

async function migrateSupportRequests() {
  console.log('\n📦 Migrating Support Requests...');
  const mongoRequests = await MongoSupportRequest.find({}).lean();
  stats.supportRequests.total = mongoRequests.length;
  
  for (const req of mongoRequests) {
    try {
      const mysqlReq = await SupportRequest.create({
        ticketNumber: req.ticketNumber,
        createdBy: mapUserId(req.createdBy) || 1,
        requesterName: req.requesterName,
        requesterEmail: req.requesterEmail,
        requesterRole: req.requesterRole,
        category: req.category,
        priority: req.priority || 'medium',
        subject: req.subject,
        message: req.message,
        status: req.status || 'open',
        resolutionNotes: req.resolutionNotes,
        assignedTo: mapUserId(req.assignedTo)
      });
      
      idMaps.supportRequests.set(req._id.toString(), mysqlReq.id);
      stats.supportRequests.migrated++;
      
      // Migrate updates and attachments
      await migrateSupportRequestUpdates(req, mysqlReq.id);
      await migrateSupportRequestAttachments(req, mysqlReq.id);
      
    } catch (error) {
      console.error(`  ❌ Failed to migrate support request ${req.ticketNumber}:`, error.message);
      stats.supportRequests.failed++;
    }
  }
  
  console.log(`  ✅ Support Requests: ${stats.supportRequests.migrated}/${stats.supportRequests.total} migrated`);
}

async function migrateSupportRequestUpdates(mongoReq, mysqlReqId) {
  if (!mongoReq.updates?.length) return;
  
  stats.supportUpdates.total += mongoReq.updates.length;
  
  for (const update of mongoReq.updates) {
    try {
      await SupportRequestUpdate.create({
        supportRequestId: mysqlReqId,
        actorId: mapUserId(update.actor) || 1,
        action: update.action,
        notes: update.notes
      });
      stats.supportUpdates.migrated++;
    } catch (error) {
      stats.supportUpdates.failed++;
    }
  }
}

async function migrateSupportRequestAttachments(mongoReq, mysqlReqId) {
  if (!mongoReq.attachments?.length) return;
  
  stats.supportAttachments.total += mongoReq.attachments.length;
  
  for (const att of mongoReq.attachments) {
    try {
      await SupportRequestAttachment.create({
        supportRequestId: mysqlReqId,
        storedName: att.storedName,
        originalName: att.originalName,
        mimeType: att.mimeType,
        size: att.size || 0
      });
      stats.supportAttachments.migrated++;
    } catch (error) {
      stats.supportAttachments.failed++;
    }
  }
}

// ============================================
// MAIN MIGRATION FUNCTION
// ============================================

async function migrate() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   MongoDB to MySQL Migration');
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/landdonation');
    console.log('  ✅ MongoDB connected');
    
    // Connect to MySQL and sync schema
    console.log('\n🔌 Connecting to MySQL...');
    await sequelize.authenticate();
    console.log('  ✅ MySQL connected');
    
    console.log('\n📐 Synchronizing MySQL schema (creating tables)...');
    await syncDatabase({ force: true }); // WARNING: This drops existing tables!
    console.log('  ✅ Schema synchronized');
    
    // Run migrations in order (respecting foreign key dependencies)
    await migrateUsers();
    await migrateRequisitions();
    await migrateConsultantPlans();
    await migrateWaterQualitySamples();
    await migrateAccessRequests();
    await migrateSupportRequests();
    
    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    
    for (const [entity, data] of Object.entries(stats)) {
      if (data.total > 0) {
        const status = data.failed === 0 ? '✅' : '⚠️';
        console.log(`${status} ${entity.padEnd(25)} ${data.migrated}/${data.total} (${data.failed} failed)`);
      }
    }
    
    const totalMigrated = Object.values(stats).reduce((sum, s) => sum + s.migrated, 0);
    const totalFailed = Object.values(stats).reduce((sum, s) => sum + s.failed, 0);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`   TOTAL: ${totalMigrated} records migrated, ${totalFailed} failed`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    await sequelize.close();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
