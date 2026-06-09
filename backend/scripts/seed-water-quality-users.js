#!/usr/bin/env node
/**
 * Seed default users for the water quality workflow (MySQL / Sequelize).
 * Usage: node scripts/seed-water-quality-users.js
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { User, Counter } = require('../models-sql');

const DEFAULT_PASSWORD = process.env.DEFAULT_WATER_QUALITY_PASSWORD || 'Water@2025!';

const SEED_USERS = [
  { name: 'Environmental Risk Analyst', email: 'ra.environment@prmsc.gov', role: 'RA Environment' },
  { name: 'PCRWR Field Sampler', email: 'sampler.pcrwr@prmsc.gov', role: 'PCRWR Sampler' },
  { name: 'PCRWR Lab Analyst', email: 'lab.pcrwr@prmsc.gov', role: 'PCRWR Lab' }
];

async function nextSimpleId() {
  const [counter] = await Counter.findOrCreate({
    where: { counterKey: 'user-simple-id' },
    defaults: { seq: 0 }
  });
  counter.seq += 1;
  await counter.save();
  return counter.seq;
}

async function main() {
  await sequelize.authenticate();
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const seed of SEED_USERS) {
    const existing = await User.findOne({ where: { email: seed.email } });
    if (existing) {
      console.log(`Skip (exists): ${seed.email}`);
      continue;
    }
    await User.create({
      ...seed,
      password: hashed,
      simpleId: await nextSimpleId(),
      activeStatus: 'active'
    });
    console.log(`Created: ${seed.email} (${seed.role})`);
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
