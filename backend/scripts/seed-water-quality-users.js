#!/usr/bin/env node
/**
 * Seed default users required for the water quality workflow.
 *
 * Creates the following accounts when they do not already exist:
 *  - RA Environment (ra.environment@prmsc.gov)
 *  - PCRWR Sampler (sampler.pcrwr@prmsc.gov)
 *  - PCRWR Lab (lab.pcrwr@prmsc.gov)
 *
 * Usage: from the backend directory run `node scripts/seed-water-quality-users.js`.
 */
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGODB_URI
  || process.env.MONGO_URI
  || 'mongodb://localhost:27017/landdonation';

const DEFAULT_PASSWORD = process.env.DEFAULT_WATER_QUALITY_PASSWORD || 'Water@2025!';

const SEED_USERS = [
  {
    name: 'Environmental Risk Analyst',
    email: 'ra.environment@prmsc.gov',
    role: 'RA Environment'
  },
  {
    name: 'PCRWR Field Sampler',
    email: 'sampler.pcrwr@prmsc.gov',
    role: 'PCRWR Sampler'
  },
  {
    name: 'PCRWR Laboratory Analyst',
    email: 'lab.pcrwr@prmsc.gov',
    role: 'PCRWR Lab'
  }
];

async function ensureUser(seed) {
  const existing = await User.findOne({ email: seed.email });
  if (existing) {
    console.log(`Skipping ${seed.email} (already exists as ${existing.role}).`);
    return { email: existing.email, role: existing.role, created: false };
  }

  const user = new User({
    name: seed.name,
    email: seed.email,
    role: seed.role,
    password: DEFAULT_PASSWORD,
    activeStatus: 'active'
  });
  await user.save();

  console.log(`Created ${seed.role} account (${seed.email}).`);
  return { email: user.email, role: user.role, created: true };
}

async function main() {
  console.log('[seed-water-quality-users] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const results = [];
  for (const seed of SEED_USERS) {
    try {
      const result = await ensureUser(seed);
      results.push(result);
    } catch (err) {
      console.error(`Failed to process ${seed.email}:`, err.message);
    }
  }

  const created = results.filter(entry => entry.created);
  const skipped = results.filter(entry => !entry.created);

  console.log('\n[seed-water-quality-users] Summary');
  console.log(`  Accounts created: ${created.length}`);
  created.forEach(entry => console.log(`    - ${entry.role}: ${entry.email}`));
  console.log(`  Accounts skipped: ${skipped.length}`);
  skipped.forEach(entry => console.log(`    - ${entry.role}: ${entry.email}`));
  if (created.length) {
    console.log(`\n  Default password assigned: ${DEFAULT_PASSWORD}`);
  }
}

main()
  .catch(err => {
    console.error('[seed-water-quality-users] Unexpected failure:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
    console.log('[seed-water-quality-users] Done.');
  });
