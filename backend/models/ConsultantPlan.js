const mongoose = require('mongoose');

const MaintenanceRecordSchema = new mongoose.Schema(
  {
    performedAt: { type: Date, required: true },
    type: {
      type: String,
      enum: ['preventive', 'corrective', 'emergency', 'inspection'],
      default: 'preventive'
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled'],
      default: 'completed'
    },
    description: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    recordedByName: { type: String, default: '' }
  },
  { _id: true }
);

const ConsultantPlanSchema = new mongoose.Schema({
  title: { type: String, required: true },
  assetType: { type: String, required: true },
  assetLabel: { type: String, required: true },
  category: { type: String, required: true },
  layerName: { type: String, default: 'PRMSC Red Book Assets' },
  description: { type: String, default: '' },
  requisition: { type: mongoose.Schema.Types.ObjectId, ref: 'Requisition', default: null },
  tehsil: { type: String, default: '' },
  district: { type: String, default: '' },
  feature: {
    type: { type: String, default: 'Feature' },
    geometry: { type: mongoose.Schema.Types.Mixed, required: true },
    properties: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  attachments: {
    type: [
      new mongoose.Schema(
        {
          storedName: { type: String, required: true },
          originalName: { type: String, default: '' },
          mimeType: { type: String, default: '' },
          size: { type: Number, default: 0 }
        },
        { _id: false }
      ),
    ],
    default: [],
  },
  maintenanceRecords: {
    type: [MaintenanceRecordSchema],
    default: []
  },
  criticalFlag: { type: Boolean, default: false, index: true },
  criticalReason: { type: String, default: '' },
  criticalMarkedAt: { type: Date, default: null },
  criticalMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  criticalMarkedByName: { type: String, default: '' },
  criticalAcknowledgedAt: { type: Date, default: null },
  criticalAcknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  criticalAcknowledgedByName: { type: String, default: '' },
  latestQualityStatus: {
    type: new mongoose.Schema(
      {
        status: { type: String, default: 'normal' },
        score: { type: Number, default: null },
        label: { type: String, default: 'Normal' },
        updatedAt: { type: Date, default: null }
      },
      { _id: false }
    ),
    default: {}
  },
  maintenanceOwnerRole: { type: String, default: 'Tehsil Manager' },
  maintenanceOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  maintenanceOwnerName: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ConsultantPlanSchema.pre('save', function setUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for improved query performance
ConsultantPlanSchema.index({ tehsil: 1 });
ConsultantPlanSchema.index({ district: 1 });
ConsultantPlanSchema.index({ category: 1 });
ConsultantPlanSchema.index({ criticalFlag: 1 });
ConsultantPlanSchema.index({ createdAt: -1 });
ConsultantPlanSchema.index({ tehsil: 1, category: 1 });
ConsultantPlanSchema.index({ 'feature.geometry': '2dsphere' }); // Spatial index for GeoJSON

// Compound indexes for common query patterns
ConsultantPlanSchema.index({ tehsil: 1, criticalFlag: 1, createdAt: -1 });
ConsultantPlanSchema.index({ district: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('ConsultantPlan', ConsultantPlanSchema);
