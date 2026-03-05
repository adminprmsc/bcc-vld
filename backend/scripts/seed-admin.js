/**
 * Seed Initial Admin User
 * Creates a Super Admin user for first login
 * 
 * Usage: node scripts/seed-admin.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { User, Counter } = require('../models-sql');

async function seedAdmin() {
  console.log('🌱 Seeding initial admin user...\n');
  
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email: 'admin@lds.gov.pk' } });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. Skipping...');
      return;
    }
    
    // Get next simple ID
    let counter = await Counter.findOne({ where: { counterKey: 'user-simple-id' } });
    if (!counter) {
      counter = await Counter.create({ counterKey: 'user-simple-id', seq: 0 });
    }
    const nextId = counter.seq + 1;
    
    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    // Create Super Admin
    const admin = await User.create({
      simpleId: nextId,
      name: 'System Administrator',
      email: 'admin@lds.gov.pk',
      password: hashedPassword,
      role: 'Super Admin',
      activeStatus: 'active',
      phone: '+92-300-0000000'
    });
    
    // Update counter
    await counter.update({ seq: nextId });
    
    console.log('\n════════════════════════════════════════════════════');
    console.log('   ADMIN USER CREATED SUCCESSFULLY');
    console.log('════════════════════════════════════════════════════');
    console.log(`   Email:    admin@lds.gov.pk`);
    console.log(`   Password: Admin@123`);
    console.log(`   Role:     Super Admin`);
    console.log(`   ID:       ${admin.id}`);
    console.log('════════════════════════════════════════════════════');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');
    
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

seedAdmin()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
