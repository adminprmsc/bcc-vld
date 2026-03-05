const mongoose = require('mongoose');

async function createTicketNumber(model) {
  const prefix = 'SUP';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)
      .toString(36)
      .toUpperCase()}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await model.exists({ ticketNumber: candidate });
    if (!exists) {
      return candidate;
    }
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

const SupportRequestSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterName: { type: String, required: true },
  requesterEmail: { type: String, required: true },
  requesterRole: { type: String, default: '' },
  category: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  subject: { type: String, default: '' },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  resolutionNotes: { type: String, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updates: {
    type: [
      {
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        action: { type: String, required: true },
        notes: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    default: []
  },
  attachments: {
    type: [
      {
        storedName: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, default: '' },
        size: { type: Number, default: 0 }
      }
    ],
    default: []
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SupportRequestSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

SupportRequestSchema.pre('validate', async function (next) {
  if (!this.ticketNumber) {
    this.ticketNumber = await this.constructor.generateTicketNumber();
  }
  next();
});

SupportRequestSchema.statics.generateTicketNumber = function generateTicketNumber() {
  return createTicketNumber(this);
};

module.exports = mongoose.model('SupportRequest', SupportRequestSchema);
