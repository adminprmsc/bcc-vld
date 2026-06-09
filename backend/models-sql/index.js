/**
 * Sequelize Models Index
 * Exports all MySQL models and associations
 */

const { sequelize, Sequelize, DataTypes } = require('../config/database');
const bcrypt = require('bcryptjs');

// ================================================
// COUNTER MODEL - For sequence generation
// ================================================
class Counter extends Sequelize.Model {}

Counter.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  counterKey: { type: DataTypes.STRING(100), allowNull: false, unique: true, field: 'counter_key' },
  seq: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 }
}, {
  sequelize,
  modelName: 'Counter',
  tableName: 'counters',
  timestamps: false
});

// Helper function for sequence generation
async function getNextSequence(key) {
  const [counter] = await Counter.findOrCreate({
    where: { counterKey: key },
    defaults: { seq: 0 }
  });
  counter.seq += 1;
  await counter.save();
  return counter.seq;
}

// ================================================
// USER MODEL
// ================================================
class User extends Sequelize.Model {
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }
  
  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}

User.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  simpleId: { type: DataTypes.INTEGER.UNSIGNED, unique: true, field: 'simple_id' },
  name: { type: DataTypes.STRING(255), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: {
    type: DataTypes.ENUM(
      'Super Admin', 'Admin', 'DM Tehsil', 'Infra Engineer', 'CID',
      'BCC Specialist', 'BCC Officer Tehsil', 'EDCS Consultant', 'EDCS User',
      'RA Environment', 'PCRWR Sampler', 'PCRWR Lab', 'Tehsil Manager',
      'WB User', 'Citizen'
    ),
    allowNull: false
  },
  gender: DataTypes.STRING(20),
  cnic: DataTypes.STRING(20),
  cnicExpiry: { type: DataTypes.STRING(50), field: 'cnic_expiry' },
  address: DataTypes.TEXT,
  dob: DataTypes.STRING(50),
  phone: DataTypes.STRING(30),
  activeStatus: { type: DataTypes.STRING(20), defaultValue: 'inactive', field: 'active_status' },
  pushToken: { type: DataTypes.STRING(255), field: 'push_token' },
  pushPlatform: { type: DataTypes.STRING(50), field: 'push_platform' },
  pushDeviceName: { type: DataTypes.STRING(255), field: 'push_device_name' },
  pushTokenUpdatedAt: { type: DataTypes.DATE, field: 'push_token_updated_at' }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      if (!user.simpleId) {
        user.simpleId = await getNextSequence('user-simple-id');
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  },
  indexes: [
    { fields: ['role'] },
    { fields: ['email'], unique: true },
    { fields: ['active_status'] }
  ]
});

// ================================================
// REQUISITION MODEL
// ================================================
class Requisition extends Sequelize.Model {}

Requisition.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  sequenceNumber: { type: DataTypes.INTEGER.UNSIGNED, unique: true, field: 'sequence_number' },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: DataTypes.TEXT,
  purpose: { type: DataTypes.STRING(500), allowNull: false },
  division: { type: DataTypes.STRING(100), defaultValue: '' },
  district: { type: DataTypes.STRING(100), defaultValue: '' },
  tehsil: { type: DataTypes.STRING(100), allowNull: false },
  requestedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'requested_by' },
  assignedTo: { type: DataTypes.BIGINT.UNSIGNED, field: 'assigned_to' },
  landArea: { type: DataTypes.STRING(100), field: 'land_area' },
  landType: { type: DataTypes.STRING(100), field: 'land_type' },
  landBreadth: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0, field: 'land_breadth' },
  landDepth: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0, field: 'land_depth' },
  calculatedAreaSqFt: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0, field: 'calculated_area_sq_ft' },
  calculatedAreaMarlas: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0, field: 'calculated_area_marlas' },
  calculatedAreaKanals: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0, field: 'calculated_area_kanals' },
  locationAddress: { type: DataTypes.TEXT, field: 'location_address' },
  locationLat: { type: DataTypes.DECIMAL(10, 8), field: 'location_lat' },
  locationLng: { type: DataTypes.DECIMAL(11, 8), field: 'location_lng' },
  mapMarkerLat: { type: DataTypes.DECIMAL(10, 8), field: 'map_marker_lat' },
  mapMarkerLng: { type: DataTypes.DECIMAL(11, 8), field: 'map_marker_lng' },
  mapViewportCenterLat: { type: DataTypes.DECIMAL(10, 8), field: 'map_viewport_center_lat' },
  mapViewportCenterLng: { type: DataTypes.DECIMAL(11, 8), field: 'map_viewport_center_lng' },
  mapViewportZoom: { type: DataTypes.INTEGER, defaultValue: 0, field: 'map_viewport_zoom' },
  govtLandChecklist: { type: DataTypes.JSON, field: 'govt_land_checklist' },
  privateLandChecklist: { type: DataTypes.JSON, field: 'private_land_checklist' },
  mapFeatures: { type: DataTypes.JSON, field: 'map_features' },
  landAcquisitionType: { type: DataTypes.ENUM('Govt Land', 'Private Land'), field: 'land_acquisition_type' },
  landAcquisitionStatus: { type: DataTypes.STRING(100), defaultValue: '', field: 'land_acquisition_status' },
  landAcquisitionData: { type: DataTypes.JSON, field: 'land_acquisition_data' },
  landAcquisitionUpdatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'land_acquisition_updated_by' },
  landAcquisitionUpdatedAt: { type: DataTypes.DATE, field: 'land_acquisition_updated_at' },
  landUtilizationPhase: { type: DataTypes.STRING(100), field: 'land_utilization_phase' },
  landUtilizationSummary: { type: DataTypes.TEXT, field: 'land_utilization_summary' },
  landUtilizationNextMilestone: { type: DataTypes.STRING(255), field: 'land_utilization_next_milestone' },
  landUtilizationGallery: { type: DataTypes.JSON, field: 'land_utilization_gallery' },
  landUtilizationUpdatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'land_utilization_updated_by' },
  landUtilizationUpdatedAt: { type: DataTypes.DATE, field: 'land_utilization_updated_at' },
  requiredDate: { type: DataTypes.DATEONLY, field: 'required_date' },
  priority: { type: DataTypes.ENUM('Low', 'Medium', 'High'), defaultValue: 'Medium' },
  supportingDocs: { type: DataTypes.JSON, field: 'supporting_docs' },
  status: { type: DataTypes.STRING(50), defaultValue: 'Pending' },
  estimatedValue: { type: DataTypes.STRING(100), field: 'estimated_value' },
  remarks: DataTypes.TEXT,
  attachments: DataTypes.JSON,
  dateCreated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'date_created' },
  lastUpdated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'last_updated' }
}, {
  sequelize,
  modelName: 'Requisition',
  tableName: 'requisitions',
  timestamps: false,
  hooks: {
    beforeCreate: async (requisition) => {
      if (!requisition.sequenceNumber) {
        requisition.sequenceNumber = await getNextSequence('requisition-sequence');
      }
    },
    beforeUpdate: (requisition) => {
      requisition.lastUpdated = new Date();
    }
  },
  indexes: [
    { fields: ['tehsil'] },
    { fields: ['district'] },
    { fields: ['status'] },
    { fields: ['requested_by'] },
    { fields: ['assigned_to'] },
    { fields: ['date_created'] }
  ]
});

// ================================================
// REQUISITION ACTIVITY LOG MODEL
// ================================================
class RequisitionActivityLog extends Sequelize.Model {}

RequisitionActivityLog.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  requisitionId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'requisition_id' },
  action: DataTypes.STRING(255),
  userId: { type: DataTypes.BIGINT.UNSIGNED, field: 'user_id' },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  remarks: DataTypes.TEXT,
  meta: DataTypes.JSON
}, {
  sequelize,
  modelName: 'RequisitionActivityLog',
  tableName: 'requisition_activity_logs',
  timestamps: false,
  indexes: [
    { fields: ['requisition_id'] },
    { fields: ['timestamp'] }
  ]
});

// ================================================
// REQUISITION CIVIL STRUCTURES MODEL
// ================================================
class RequisitionCivilStructure extends Sequelize.Model {}

RequisitionCivilStructure.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  requisitionId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'requisition_id' },
  name: { type: DataTypes.STRING(255), allowNull: false },
  category: DataTypes.STRING(100),
  status: { type: DataTypes.STRING(50), defaultValue: 'Planned' },
  description: DataTypes.TEXT,
  attributes: DataTypes.JSON,
  photos: DataTypes.JSON,
  updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by' }
}, {
  sequelize,
  modelName: 'RequisitionCivilStructure',
  tableName: 'requisition_civil_structures',
  indexes: [{ fields: ['requisition_id'] }]
});

// ================================================
// REQUISITION MACHINERY MODEL
// ================================================
class RequisitionMachinery extends Sequelize.Model {}

RequisitionMachinery.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  requisitionId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'requisition_id' },
  name: { type: DataTypes.STRING(255), allowNull: false },
  type: DataTypes.STRING(100),
  status: { type: DataTypes.STRING(50), defaultValue: 'Idle' },
  capacity: DataTypes.STRING(100),
  manufacturer: DataTypes.STRING(255),
  attributes: DataTypes.JSON,
  photos: DataTypes.JSON,
  updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by' }
}, {
  sequelize,
  modelName: 'RequisitionMachinery',
  tableName: 'requisition_machinery',
  indexes: [{ fields: ['requisition_id'] }]
});

// ================================================
// REQUISITION PROGRESS UPDATES MODEL
// ================================================
class RequisitionProgressUpdate extends Sequelize.Model {}

RequisitionProgressUpdate.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  requisitionId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'requisition_id' },
  status: { type: DataTypes.STRING(100), allowNull: false },
  description: DataTypes.TEXT,
  progressDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'progress_date' },
  completionPercentage: { type: DataTypes.TINYINT.UNSIGNED, field: 'completion_percentage' },
  attachments: DataTypes.JSON,
  updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by' }
}, {
  sequelize,
  modelName: 'RequisitionProgressUpdate',
  tableName: 'requisition_progress_updates',
  indexes: [
    { fields: ['requisition_id'] },
    { fields: ['progress_date'] }
  ]
});

// ================================================
// CONSULTANT PLAN MODEL
// ================================================
class ConsultantPlan extends Sequelize.Model {}

ConsultantPlan.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  assetType: { type: DataTypes.STRING(100), allowNull: false, field: 'asset_type' },
  assetLabel: { type: DataTypes.STRING(100), allowNull: false, field: 'asset_label' },
  category: { type: DataTypes.STRING(100), allowNull: false },
  layerName: { type: DataTypes.STRING(255), defaultValue: 'PRMSC Red Book Assets', field: 'layer_name' },
  description: DataTypes.TEXT,
  requisitionId: { type: DataTypes.BIGINT.UNSIGNED, field: 'requisition_id' },
  tehsil: { type: DataTypes.STRING(100), defaultValue: '' },
  district: { type: DataTypes.STRING(100), defaultValue: '' },
  featureType: { type: DataTypes.STRING(50), defaultValue: 'Feature', field: 'feature_type' },
  featureGeometry: { type: DataTypes.JSON, allowNull: false, field: 'feature_geometry' },
  featureProperties: { type: DataTypes.JSON, field: 'feature_properties' },
  attributes: DataTypes.JSON,
  criticalFlag: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'critical_flag' },
  criticalReason: { type: DataTypes.TEXT, field: 'critical_reason' },
  criticalMarkedAt: { type: DataTypes.DATE, field: 'critical_marked_at' },
  criticalMarkedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'critical_marked_by' },
  criticalMarkedByName: { type: DataTypes.STRING(255), field: 'critical_marked_by_name' },
  criticalAcknowledgedAt: { type: DataTypes.DATE, field: 'critical_acknowledged_at' },
  criticalAcknowledgedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'critical_acknowledged_by' },
  criticalAcknowledgedByName: { type: DataTypes.STRING(255), field: 'critical_acknowledged_by_name' },
  latestQualityStatusStatus: { type: DataTypes.STRING(50), defaultValue: 'normal', field: 'latest_quality_status_status' },
  latestQualityStatusScore: { type: DataTypes.DECIMAL(5, 2), field: 'latest_quality_status_score' },
  latestQualityStatusLabel: { type: DataTypes.STRING(100), defaultValue: 'Normal', field: 'latest_quality_status_label' },
  latestQualityStatusUpdatedAt: { type: DataTypes.DATE, field: 'latest_quality_status_updated_at' },
  maintenanceOwnerRole: { type: DataTypes.STRING(100), defaultValue: 'Tehsil Manager', field: 'maintenance_owner_role' },
  maintenanceOwner: { type: DataTypes.BIGINT.UNSIGNED, field: 'maintenance_owner' },
  maintenanceOwnerName: { type: DataTypes.STRING(255), field: 'maintenance_owner_name' },
  createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'created_by' },
  updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by' }
}, {
  sequelize,
  modelName: 'ConsultantPlan',
  tableName: 'consultant_plans',
  indexes: [
    { fields: ['tehsil'] },
    { fields: ['district'] },
    { fields: ['category'] },
    { fields: ['critical_flag'] },
    { fields: ['created_at'] }
  ]
});

// ================================================
// CONSULTANT PLAN ATTACHMENTS MODEL
// ================================================
class ConsultantPlanAttachment extends Sequelize.Model {}

ConsultantPlanAttachment.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  consultantPlanId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'consultant_plan_id' },
  storedName: { type: DataTypes.STRING(500), allowNull: false, field: 'stored_name' },
  originalName: { type: DataTypes.STRING(500), defaultValue: '', field: 'original_name' },
  mimeType: { type: DataTypes.STRING(100), defaultValue: '', field: 'mime_type' },
  size: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 }
}, {
  sequelize,
  modelName: 'ConsultantPlanAttachment',
  tableName: 'consultant_plan_attachments',
  indexes: [{ fields: ['consultant_plan_id'] }]
});

// ================================================
// CONSULTANT PLAN MAINTENANCE RECORDS MODEL
// ================================================
class ConsultantPlanMaintenanceRecord extends Sequelize.Model {}

ConsultantPlanMaintenanceRecord.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  consultantPlanId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'consultant_plan_id' },
  performedAt: { type: DataTypes.DATE, allowNull: false, field: 'performed_at' },
  type: { type: DataTypes.ENUM('preventive', 'corrective', 'emergency', 'inspection'), defaultValue: 'preventive' },
  status: { type: DataTypes.ENUM('completed', 'pending', 'cancelled'), defaultValue: 'completed' },
  description: DataTypes.TEXT,
  cost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  notes: DataTypes.TEXT,
  recordedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'recorded_by' },
  recordedByName: { type: DataTypes.STRING(255), field: 'recorded_by_name' }
}, {
  sequelize,
  modelName: 'ConsultantPlanMaintenanceRecord',
  tableName: 'consultant_plan_maintenance_records',
  indexes: [
    { fields: ['consultant_plan_id'] },
    { fields: ['performed_at'] }
  ]
});

// ================================================
// WATER QUALITY SAMPLE MODEL
// ================================================
class WaterQualitySample extends Sequelize.Model {}

WaterQualitySample.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  planId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'plan_id' },
  planSnapshotPlanId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'plan_snapshot_plan_id' },
  planSnapshotTitle: { type: DataTypes.STRING(255), defaultValue: '', field: 'plan_snapshot_title' },
  planSnapshotCategory: { type: DataTypes.STRING(100), defaultValue: '', field: 'plan_snapshot_category' },
  planSnapshotTehsil: { type: DataTypes.STRING(100), defaultValue: '', field: 'plan_snapshot_tehsil' },
  planSnapshotDistrict: { type: DataTypes.STRING(100), defaultValue: '', field: 'plan_snapshot_district' },
  status: {
    type: DataTypes.ENUM('awaiting_assignment', 'awaiting_collection', 'collecting', 'in_lab', 'results_ready', 'closed', 'cancelled'),
    defaultValue: 'awaiting_assignment'
  },
  assignedSampler: { type: DataTypes.BIGINT.UNSIGNED, field: 'assigned_sampler' },
  assignedSamplerName: { type: DataTypes.STRING(255), field: 'assigned_sampler_name' },
  assignedAt: { type: DataTypes.DATE, field: 'assigned_at' },
  collectionCollectedAt: { type: DataTypes.DATE, field: 'collection_collected_at' },
  collectionFieldNotes: { type: DataTypes.TEXT, field: 'collection_field_notes' },
  collectionLocationLat: { type: DataTypes.DECIMAL(10, 8), field: 'collection_location_lat' },
  collectionLocationLng: { type: DataTypes.DECIMAL(11, 8), field: 'collection_location_lng' },
  collectionCollectedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'collection_collected_by' },
  collectionCollectedByName: { type: DataTypes.STRING(255), field: 'collection_collected_by_name' },
  labAnalysisReceivedAt: { type: DataTypes.DATE, field: 'lab_analysis_received_at' },
  labAnalysisCompletedAt: { type: DataTypes.DATE, field: 'lab_analysis_completed_at' },
  labAnalysisAnalyst: { type: DataTypes.BIGINT.UNSIGNED, field: 'lab_analysis_analyst' },
  labAnalysisAnalystName: { type: DataTypes.STRING(255), field: 'lab_analysis_analyst_name' },
  labAnalysisMetrics: { type: DataTypes.JSON, field: 'lab_analysis_metrics' },
  labAnalysisNotes: { type: DataTypes.TEXT, field: 'lab_analysis_notes' },
  computedScoreIndexName: { type: DataTypes.STRING(100), defaultValue: 'potability-index', field: 'computed_score_index_name' },
  computedScoreValue: { type: DataTypes.DECIMAL(8, 4), field: 'computed_score_value' },
  computedScoreRating: { type: DataTypes.STRING(50), defaultValue: 'pending', field: 'computed_score_rating' },
  computedScoreUpdatedAt: { type: DataTypes.DATE, field: 'computed_score_updated_at' },
  createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'created_by' },
  createdByName: { type: DataTypes.STRING(255), field: 'created_by_name' },
  updatedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'updated_by' },
  updatedByName: { type: DataTypes.STRING(255), field: 'updated_by_name' }
}, {
  sequelize,
  modelName: 'WaterQualitySample',
  tableName: 'water_quality_samples',
  indexes: [
    { fields: ['plan_id'] },
    { fields: ['status'] },
    { fields: ['plan_snapshot_tehsil', 'status'] },
    { fields: ['created_at'] }
  ]
});

// ================================================
// WATER QUALITY SAMPLE STATUS HISTORY
// ================================================
class WaterQualitySampleStatusHistory extends Sequelize.Model {}

WaterQualitySampleStatusHistory.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  sampleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'sample_id' },
  code: {
    type: DataTypes.ENUM('critical_flagged', 'assignment', 'collection_started', 'collection_complete', 'in_lab', 'results_posted', 'closed', 'cancelled'),
    allowNull: false
  },
  label: { type: DataTypes.STRING(255), allowNull: false },
  note: DataTypes.TEXT,
  tone: { type: DataTypes.ENUM('info', 'success', 'warning', 'critical'), defaultValue: 'info' },
  createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'created_by' },
  createdByName: { type: DataTypes.STRING(255), field: 'created_by_name' }
}, {
  sequelize,
  modelName: 'WaterQualitySampleStatusHistory',
  tableName: 'water_quality_sample_status_history',
  indexes: [
    { fields: ['sample_id'] },
    { fields: ['created_at'] }
  ]
});

// ================================================
// WATER QUALITY SAMPLE ATTACHMENTS
// ================================================
class WaterQualitySampleAttachment extends Sequelize.Model {}

WaterQualitySampleAttachment.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  sampleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'sample_id' },
  attachmentType: { type: DataTypes.ENUM('main', 'collection', 'lab_analysis'), allowNull: false, field: 'attachment_type' },
  storedName: { type: DataTypes.STRING(500), allowNull: false, field: 'stored_name' },
  originalName: { type: DataTypes.STRING(500), defaultValue: '', field: 'original_name' },
  mimeType: { type: DataTypes.STRING(100), defaultValue: '', field: 'mime_type' },
  size: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 }
}, {
  sequelize,
  modelName: 'WaterQualitySampleAttachment',
  tableName: 'water_quality_sample_attachments',
  indexes: [
    { fields: ['sample_id'] },
    { fields: ['attachment_type'] }
  ]
});

// ================================================
// ACCESS REQUEST MODEL
// ================================================
class AccessRequest extends Sequelize.Model {}

AccessRequest.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(30), allowNull: false },
  roleRequested: {
    type: DataTypes.ENUM(
      'Super Admin', 'Admin', 'DM Tehsil', 'Infra Engineer', 'CID',
      'BCC Specialist', 'BCC Officer Tehsil', 'Citizen', 'EDCS Consultant',
      'EDCS User', 'RA Environment', 'PCRWR Sampler', 'PCRWR Lab'
    ),
    defaultValue: 'Citizen',
    field: 'role_requested'
  },
  tehsil: DataTypes.STRING(100),
  message: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), defaultValue: 'Pending' },
  processedBy: { type: DataTypes.BIGINT.UNSIGNED, field: 'processed_by' },
  processedAt: { type: DataTypes.DATE, field: 'processed_at' },
  processedNotes: { type: DataTypes.TEXT, field: 'processed_notes' }
}, {
  sequelize,
  modelName: 'AccessRequest',
  tableName: 'access_requests',
  indexes: [
    { fields: ['email'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

// ================================================
// SUPPORT REQUEST MODEL
// ================================================
class SupportRequest extends Sequelize.Model {}

SupportRequest.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  ticketNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'ticket_number' },
  createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'created_by' },
  requesterName: { type: DataTypes.STRING(255), allowNull: false, field: 'requester_name' },
  requesterEmail: { type: DataTypes.STRING(255), allowNull: false, field: 'requester_email' },
  requesterRole: { type: DataTypes.STRING(100), field: 'requester_role' },
  category: { type: DataTypes.STRING(100), allowNull: false },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
  subject: DataTypes.STRING(500),
  message: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'), defaultValue: 'open' },
  resolutionNotes: { type: DataTypes.TEXT, field: 'resolution_notes' },
  assignedTo: { type: DataTypes.BIGINT.UNSIGNED, field: 'assigned_to' }
}, {
  sequelize,
  modelName: 'SupportRequest',
  tableName: 'support_requests',
  hooks: {
    beforeValidate: async (request) => {
      if (!request.ticketNumber) {
        request.ticketNumber = `SUP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString(36).toUpperCase()}`;
      }
    }
  },
  indexes: [
    { fields: ['ticket_number'], unique: true },
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['created_by'] },
    { fields: ['assigned_to'] },
    { fields: ['created_at'] }
  ]
});

// ================================================
// SUPPORT REQUEST UPDATES MODEL
// ================================================
class SupportRequestUpdate extends Sequelize.Model {}

SupportRequestUpdate.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  supportRequestId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'support_request_id' },
  actorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'actor_id' },
  action: { type: DataTypes.STRING(255), allowNull: false },
  notes: DataTypes.TEXT
}, {
  sequelize,
  modelName: 'SupportRequestUpdate',
  tableName: 'support_request_updates',
  indexes: [
    { fields: ['support_request_id'] },
    { fields: ['created_at'] }
  ]
});

// ================================================
// SUPPORT REQUEST ATTACHMENTS MODEL
// ================================================
class SupportRequestAttachment extends Sequelize.Model {}

SupportRequestAttachment.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  supportRequestId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'support_request_id' },
  storedName: { type: DataTypes.STRING(500), allowNull: false, field: 'stored_name' },
  originalName: { type: DataTypes.STRING(500), allowNull: false, field: 'original_name' },
  mimeType: DataTypes.STRING(100),
  size: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 }
}, {
  sequelize,
  modelName: 'SupportRequestAttachment',
  tableName: 'support_request_attachments',
  indexes: [{ fields: ['support_request_id'] }]
});

// ================================================
// ASSOCIATIONS
// ================================================

// User associations
User.hasMany(Requisition, { as: 'requestedRequisitions', foreignKey: 'requestedBy' });
User.hasMany(Requisition, { as: 'assignedRequisitions', foreignKey: 'assignedTo' });
User.hasMany(ConsultantPlan, { as: 'createdPlans', foreignKey: 'createdBy' });
User.hasMany(WaterQualitySample, { as: 'createdSamples', foreignKey: 'createdBy' });
User.hasMany(SupportRequest, { as: 'createdSupportRequests', foreignKey: 'createdBy' });
User.hasMany(AccessRequest, { as: 'processedAccessRequests', foreignKey: 'processedBy' });

// Requisition associations
Requisition.belongsTo(User, { as: 'requester', foreignKey: 'requestedBy' });
Requisition.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });
Requisition.hasMany(RequisitionActivityLog, { as: 'activityLogs', foreignKey: 'requisitionId', onDelete: 'CASCADE' });
Requisition.hasMany(RequisitionCivilStructure, { as: 'civilStructures', foreignKey: 'requisitionId', onDelete: 'CASCADE' });
Requisition.hasMany(RequisitionMachinery, { as: 'machinery', foreignKey: 'requisitionId', onDelete: 'CASCADE' });
Requisition.hasMany(RequisitionProgressUpdate, { as: 'progressUpdates', foreignKey: 'requisitionId', onDelete: 'CASCADE' });
Requisition.hasMany(ConsultantPlan, { as: 'consultantPlans', foreignKey: 'requisitionId' });

// Activity Log associations
RequisitionActivityLog.belongsTo(Requisition, { foreignKey: 'requisitionId' });
RequisitionActivityLog.belongsTo(User, { as: 'actor', foreignKey: 'userId' });

// Civil Structure associations
RequisitionCivilStructure.belongsTo(Requisition, { foreignKey: 'requisitionId' });
RequisitionCivilStructure.belongsTo(User, { as: 'updater', foreignKey: 'updatedBy' });

// Machinery associations
RequisitionMachinery.belongsTo(Requisition, { foreignKey: 'requisitionId' });
RequisitionMachinery.belongsTo(User, { as: 'updater', foreignKey: 'updatedBy' });

// Progress Update associations
RequisitionProgressUpdate.belongsTo(Requisition, { foreignKey: 'requisitionId' });
RequisitionProgressUpdate.belongsTo(User, { as: 'updater', foreignKey: 'updatedBy' });

// ConsultantPlan associations
ConsultantPlan.belongsTo(Requisition, { foreignKey: 'requisitionId' });
ConsultantPlan.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
ConsultantPlan.belongsTo(User, { as: 'updater', foreignKey: 'updatedBy' });
ConsultantPlan.hasMany(ConsultantPlanAttachment, { as: 'attachments', foreignKey: 'consultantPlanId', onDelete: 'CASCADE' });
ConsultantPlan.hasMany(ConsultantPlanMaintenanceRecord, { as: 'maintenanceRecords', foreignKey: 'consultantPlanId', onDelete: 'CASCADE' });
ConsultantPlan.hasMany(WaterQualitySample, { as: 'waterQualitySamples', foreignKey: 'planId' });

// ConsultantPlan Attachment associations
ConsultantPlanAttachment.belongsTo(ConsultantPlan, { foreignKey: 'consultantPlanId' });

// ConsultantPlan Maintenance Record associations
ConsultantPlanMaintenanceRecord.belongsTo(ConsultantPlan, { foreignKey: 'consultantPlanId' });
ConsultantPlanMaintenanceRecord.belongsTo(User, { as: 'recorder', foreignKey: 'recordedBy' });

// WaterQualitySample associations
WaterQualitySample.belongsTo(ConsultantPlan, { as: 'plan', foreignKey: 'planId' });
WaterQualitySample.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
WaterQualitySample.belongsTo(User, { as: 'sampler', foreignKey: 'assignedSampler' });
WaterQualitySample.belongsTo(User, { as: 'analyst', foreignKey: 'labAnalysisAnalyst' });
WaterQualitySample.hasMany(WaterQualitySampleStatusHistory, { as: 'statusHistory', foreignKey: 'sampleId', onDelete: 'CASCADE' });
WaterQualitySample.hasMany(WaterQualitySampleAttachment, { as: 'attachments', foreignKey: 'sampleId', onDelete: 'CASCADE' });

// WaterQualitySample Status History associations
WaterQualitySampleStatusHistory.belongsTo(WaterQualitySample, { foreignKey: 'sampleId' });
WaterQualitySampleStatusHistory.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

// WaterQualitySample Attachment associations
WaterQualitySampleAttachment.belongsTo(WaterQualitySample, { foreignKey: 'sampleId' });

// AccessRequest associations
AccessRequest.belongsTo(User, { as: 'processor', foreignKey: 'processedBy' });

// SupportRequest associations
SupportRequest.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
SupportRequest.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });
SupportRequest.hasMany(SupportRequestUpdate, { as: 'updates', foreignKey: 'supportRequestId', onDelete: 'CASCADE' });
SupportRequest.hasMany(SupportRequestAttachment, { as: 'attachments', foreignKey: 'supportRequestId', onDelete: 'CASCADE' });

// SupportRequest Update associations
SupportRequestUpdate.belongsTo(SupportRequest, { foreignKey: 'supportRequestId' });
SupportRequestUpdate.belongsTo(User, { as: 'actor', foreignKey: 'actorId' });

// SupportRequest Attachment associations
SupportRequestAttachment.belongsTo(SupportRequest, { foreignKey: 'supportRequestId' });

const AuditLog = require('./AuditLog');

module.exports = {
  sequelize,
  Sequelize,
  getNextSequence,
  Counter,
  User,
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
  SupportRequestAttachment,
  AuditLog
};
