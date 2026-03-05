const mongoose = require('mongoose');
const getNextSequence = require('../utils/getNextSequence');

const ActivityLogSchema = new mongoose.Schema({
  action: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  remarks: String,
  meta: mongoose.Schema.Types.Mixed
});

const CivilStructureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  status: { type: String, default: 'Planned' },
  description: String,
  attributes: mongoose.Schema.Types.Mixed,
  photos: [String],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const MachinerySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: String,
  status: { type: String, default: 'Idle' },
  capacity: String,
  manufacturer: String,
  attributes: mongoose.Schema.Types.Mixed,
  photos: [String],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const ProgressUpdateSchema = new mongoose.Schema({
  status: { type: String, required: true },
  description: String,
  progressDate: { type: Date, default: Date.now },
  completionPercentage: { type: Number, min: 0, max: 100 },
  attachments: [String],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const RequisitionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  purpose: { type: String, required: true },
  division: { type: String, default: '' },
  district: { type: String, default: '' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tehsil: { type: String, required: true },
  landArea: String,
  landType: String,
  govtLandChecklist: { type: mongoose.Schema.Types.Mixed, default: {} },
  privateLandChecklist: { type: mongoose.Schema.Types.Mixed, default: {} },
  landBreadth: { type: Number, default: 0 },
  landDepth: { type: Number, default: 0 },
  calculatedAreaSqFt: { type: Number, default: 0 },
  calculatedAreaMarlas: { type: Number, default: 0 },
  calculatedAreaKanals: { type: Number, default: 0 },
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  mapMarker: {
    lat: Number,
    lng: Number
  },
  mapViewport: {
    center: {
      lat: Number,
      lng: Number
    },
    zoom: { type: Number, default: 0 }
  },
  mapFeatures: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  sequenceNumber: { type: Number, unique: true, sparse: true },
  landAcquisition: {
    type: { type: String, enum: ['Govt Land', 'Private Land'], default: '' },
    status: { type: String, default: '' },
    donor: {
      fullName: String,
      cnic: String,
      contactNumber: String,
      address: String,
      villageName: String,
      tehsil: String,
      district: String
    },
    land: {
      khasraNumber: String,
      area: String,
      landCategory: String,
      latitude: Number,
      longitude: Number,
      ownershipProof: String,
      mutationNumber: String,
      currentUse: String
    },
    donation: {
      donationType: String,
      purpose: String,
      willingnessDate: Date,
      remarks: String,
      attachedDocuments: [String]
    },
    verification: {
      verifiedBy: String,
      verifiedDate: Date,
      approvedBy: String,
      approvalStatus: String
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: Date
  },
  landUtilization: {
    overview: {
      phase: String,
      summary: String,
      nextMilestone: String
    },
    civilStructures: [CivilStructureSchema],
    machinery: [MachinerySchema],
    progressUpdates: [ProgressUpdateSchema],
    gallery: [String],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: Date
  },
  requiredDate: Date,
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  supportingDocs: [String],
  status: { type: String, default: 'Pending' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  estimatedValue: String,
  remarks: String,
  attachments: [String],
  activityLog: [ActivityLogSchema],
  dateCreated: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

RequisitionSchema.pre('save', async function assignSequenceNumber(next) {
  if (this.sequenceNumber != null) {
    return next();
  }
  try {
    this.sequenceNumber = await getNextSequence('requisition-sequence');
    next();
  } catch (err) {
    next(err);
  }
});

// Indexes for improved query performance
RequisitionSchema.index({ tehsil: 1 });
RequisitionSchema.index({ district: 1 });
RequisitionSchema.index({ status: 1 });
RequisitionSchema.index({ requestedBy: 1 });
RequisitionSchema.index({ assignedTo: 1 });
RequisitionSchema.index({ dateCreated: -1 });
RequisitionSchema.index({ sequenceNumber: 1 }, { unique: true, sparse: true });

// Compound indexes for common query patterns
RequisitionSchema.index({ tehsil: 1, status: 1, dateCreated: -1 });
RequisitionSchema.index({ requestedBy: 1, status: 1 });
RequisitionSchema.index({ assignedTo: 1, status: 1 });

// Spatial indexes for location queries
RequisitionSchema.index({ 'location.coordinates': '2dsphere' });
RequisitionSchema.index({ 'mapMarker': '2dsphere' });

module.exports = mongoose.model('Requisition', RequisitionSchema);
