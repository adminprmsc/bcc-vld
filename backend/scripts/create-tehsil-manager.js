#!/usr/bin/env node
/**
 * Script to seed a default Tehsil Manager account.
 * Run with `node scripts/create-tehsil-manager.js` from the backend directory.
 */
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/landdonation';

const SEED_USER = {
  name: 'Tehsil Manager PRMSC',
  email: 'tehsil.manager@prmsc.gov',
  password: 'TM@2025!',
  role: 'Tehsil Manager',
  activeStatus: 'active'
};

async function main() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const existing = await User.findOne({ email: SEED_USER.email });
  if (existing) {
    console.log('User already exists with numericId:', existing.simpleId);
    return;
  }

  const user = new User(SEED_USER);
  await user.save();
  console.log('Tehsil Manager user created successfully.');
  console.log('numericId:', user.simpleId);
  console.log('email:', SEED_USER.email);
  console.log('password:', SEED_USER.password);
}

main()
  .catch(err => {
    console.error('Failed to create Tehsil Manager user:', err);
  })
  .finally(() => mongoose.connection.close());
