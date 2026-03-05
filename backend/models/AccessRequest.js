const mongoose = require('mongoose');

const AccessRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  roleRequested: {
    type: String,
    enum: ['Super Admin', 'Admin', 'DM Tehsil', 'Infra Engineer', 'CID', 'BCC Specialist', 'BCC Officer Tehsil', 'Citizen', 'EDCS Consultant', 'EDCS User', 'RA Environment', 'PCRWR Sampler', 'PCRWR Lab'],
    default: 'Citizen'
  },
  tehsil: { type: String, trim: true },
  message: { type: String, trim: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  processedAt: { type: Date, default: null },
  processedNotes: { type: String, trim: true, default: '' }
}, {
  timestamps: true
});

AccessRequestSchema.index({ email: 1, status: 1 });

module.exports = mongoose.model('AccessRequest', AccessRequestSchema);
