const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const getNextSequence = require('../utils/getNextSequence');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: [
      'Super Admin',
      'Admin',
      'DM Tehsil',
      'Infra Engineer',
      'CID',
      'BCC Specialist',
      'BCC Officer Tehsil',
      'EDCS Consultant',
      'EDCS User',
      'RA Environment',
      'PCRWR Sampler',
      'PCRWR Lab',
      'Tehsil Manager',
      'WB User',
      'Citizen'
    ],
    required: true
  },
  gender: { type: String },
  cnic: { type: String },
  cnicExpiry: { type: String },
  address: { type: String },
  dob: { type: String },
  phone: { type: String },
  activeStatus: { type: String, default: 'inactive' },
  simpleId: { type: Number, unique: true, sparse: true }
});

// Assign compact numeric id before saving when missing
UserSchema.pre('save', async function assignSimpleId(next) {
  if (this.simpleId != null) {
    return next();
  }
  try {
    this.simpleId = await getNextSequence('user-simple-id');
    next();
  } catch (err) {
    next(err);
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
