#!/usr/bin/env node
/**
 * Auto-assign any water quality samples that are still pending assignment
 * to the default PCRWR Sampler user. Helpful for backfilling legacy data
 * after enabling automatic assignment on new samples.
 *
 * Usage: from the backend directory run
 *   node scripts/auto-assign-pending-samples.js
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const WaterQualitySample = require('../models/WaterQualitySample');

const MONGO_URI = process.env.MONGODB_URI
  || process.env.MONGO_URI
  || 'mongodb://localhost:27017/landdonation';

async function main() {
  console.log('[auto-assign-pending-samples] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const sampler = await resolveDefaultSampler();
  if (!sampler) {
    console.error('No PCRWR Sampler user found. Aborting.');
    process.exitCode = 1;
    return;
  }

  const pendingSamples = await WaterQualitySample.find({ status: 'awaiting_assignment' });
  if (!pendingSamples.length) {
    console.log('No samples remain in awaiting_assignment. Nothing to do.');
    return;
  }

  console.log(`Assigning ${pendingSamples.length} sample(s) to ${sampler.name || sampler.email}...`);

  const actorId = sampler._id;
  const actorName = sampler.name || 'PCRWR Sampler';
  const assignedAt = new Date();

  for (const sample of pendingSamples) {
    sample.assignedSampler = actorId;
    sample.assignedSamplerName = actorName;
    sample.assignedAt = assignedAt;
    sample.status = 'awaiting_collection';
    sample.statusHistory = sample.statusHistory || [];
    sample.statusHistory.push({
      code: 'assignment',
      label: 'Sampler Assigned',
      note: 'Auto-assigned via maintenance script',
      tone: 'info',
      createdAt: assignedAt,
      createdBy: actorId,
      createdByName: actorName
    });
    sample.updatedBy = actorId;
    sample.updatedByName = actorName;
    await sample.save();
  }

  console.log('Completed auto-assignment for pending samples.');
}

async function resolveDefaultSampler() {
  const preferredEmail = (process.env.DEFAULT_WATER_QUALITY_SAMPLER_EMAIL || '').trim();
  if (preferredEmail) {
    const samplerByEmail = await User.findOne({ email: preferredEmail, role: 'PCRWR Sampler' });
    if (samplerByEmail) {
      return samplerByEmail;
    }
  }

  const activeSampler = await User.findOne({ role: 'PCRWR Sampler', activeStatus: 'active' }).sort({ _id: 1 });
  if (activeSampler) {
    return activeSampler;
  }

  return User.findOne({ role: 'PCRWR Sampler' }).sort({ _id: 1 });
}

main()
  .catch(err => {
    console.error('[auto-assign-pending-samples] Failed:', err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
    console.log('[auto-assign-pending-samples] Done.');
  });
