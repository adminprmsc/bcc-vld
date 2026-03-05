const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema(
  {
    storedName: { type: String, required: true },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 }
  },
  { _id: false }
);

const StatusEventSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: ['critical_flagged', 'assignment', 'collection_started', 'collection_complete', 'in_lab', 'results_posted', 'closed', 'cancelled'],
      required: true
    },
    label: { type: String, required: true },
    note: { type: String, default: '' },
    tone: {
      type: String,
      enum: ['info', 'success', 'warning', 'critical'],
      default: 'info'
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, default: '' }
  },
  { _id: false }
);

const CollectionSchema = new mongoose.Schema(
  {
    collectedAt: { type: Date, default: null },
    fieldNotes: { type: String, default: '' },
    attachments: { type: [AttachmentSchema], default: [] },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    collectedByName: { type: String, default: '' }
  },
  { _id: false }
);

const LabAnalysisSchema = new mongoose.Schema(
  {
    receivedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    analyst: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    analystName: { type: String, default: '' },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    attachments: { type: [AttachmentSchema], default: [] },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

const PlanSnapshotSchema = new mongoose.Schema(
  {
    planId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'ConsultantPlan' },
    title: { type: String, default: '' },
    category: { type: String, default: '' },
    tehsil: { type: String, default: '' },
    district: { type: String, default: '' }
  },
  { _id: false }
);

const ComputedScoreSchema = new mongoose.Schema(
  {
    indexName: { type: String, default: 'potability-index' },
    value: { type: Number, default: null },
    rating: { type: String, default: 'pending' },
    updatedAt: { type: Date, default: null }
  },
  { _id: false }
);

const WaterQualitySampleSchema = new mongoose.Schema({
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsultantPlan', required: true, index: true },
  planSnapshot: { type: PlanSnapshotSchema, required: true },
  status: {
    type: String,
    enum: ['awaiting_assignment', 'awaiting_collection', 'collecting', 'in_lab', 'results_ready', 'closed', 'cancelled'],
    default: 'awaiting_assignment'
  },
  statusHistory: { type: [StatusEventSchema], default: [] },
  assignedSampler: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedSamplerName: { type: String, default: '' },
  assignedAt: { type: Date, default: null },
  collection: { type: CollectionSchema, default: {} },
  labAnalysis: { type: LabAnalysisSchema, default: {} },
  computedScore: { type: ComputedScoreSchema, default: {} },
  attachments: { type: [AttachmentSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedByName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

WaterQualitySampleSchema.pre('save', function assignUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

WaterQualitySampleSchema.index({ plan: 1, status: 1 });
WaterQualitySampleSchema.index({ 'planSnapshot.tehsil': 1, status: 1 });

module.exports = mongoose.model('WaterQualitySample', WaterQualitySampleSchema);
