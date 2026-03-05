const mongoose = require('mongoose');
const User = require('../models/User');
const Requisition = require('../models/Requisition');

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || '12345678';
const CONNECTION_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/landdonation';

const DEFAULT_USERS = [
  {
    name: 'District Manager (Tehsil)',
    email: 'dm.tehsil@punjab.gov.pk',
    role: 'DM Tehsil',
    phone: '0300-1111111',
    address: 'Tehsil Office Punjab'
  },
  {
    name: 'Infrastructure Engineer',
    email: 'infra.engineer@punjab.gov.pk',
    role: 'Infra Engineer',
    phone: '0300-2222222',
    address: 'Infrastructure Directorate Punjab'
  },
  {
    name: 'CID Officer',
    email: 'cid.officer@punjab.gov.pk',
    role: 'CID',
    phone: '0300-3333333',
    address: 'CID Headquarters Punjab'
  },
  {
    name: 'BCC Specialist',
    email: 'chief.bcc@punjab.gov.pk',
    role: 'BCC Specialist',
    phone: '0300-4444444',
    address: 'BCC Secretariat Punjab'
  },
  {
    name: 'BCC Officer (Tehsil)',
    email: 'bcc.officer@punjab.gov.pk',
    role: 'BCC Officer Tehsil',
    phone: '0300-5555555',
    address: 'BCC Tehsil Office Punjab'
  },
  {
    name: 'System Administrator',
    email: 'admin@punjab.gov.pk',
    role: 'Admin',
    phone: '0300-6666666',
    address: 'Provincial IT Cell'
  }
];

(async () => {
  let exitCode = 0;
  try {
    console.log('[reset] Connecting to MongoDB...');
    await mongoose.connect(CONNECTION_URI);

    console.log('[reset] Removing requisitions...');
    const requisitionResult = await Requisition.deleteMany({});
    console.log(`[reset] Deleted ${requisitionResult.deletedCount || 0} requisition(s).`);

    console.log('[reset] Removing non Super Admin users...');
    const userResult = await User.deleteMany({ role: { $ne: 'Super Admin' } });
    console.log(`[reset] Deleted ${userResult.deletedCount || 0} user(s).`);

    const createdUsers = [];
    for (const payload of DEFAULT_USERS) {
      const existing = await User.findOne({ email: payload.email });
      if (existing) {
        console.log(`[reset] Skipping ${payload.email} (already exists).`);
        continue;
      }
      const user = new User({
        name: payload.name,
        email: payload.email,
        role: payload.role,
        password: DEFAULT_PASSWORD,
        phone: payload.phone,
        address: payload.address,
        activeStatus: 'active'
      });
      await user.save();
      createdUsers.push({ email: user.email, role: user.role });
      console.log(`[reset] Created ${user.role} (${user.email}).`);
    }

    console.log('\n[reset] Summary');
    console.log(`  Users created: ${createdUsers.length}`);
    createdUsers.forEach(user => {
      console.log(`    - ${user.role}: ${user.email}`);
    });
    console.log(`  Default password assigned: ${DEFAULT_PASSWORD}`);
    console.log('\n[reset] All done.');
  } catch (err) {
    console.error('[reset] Failed to reset data:', err);
    exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    process.exit(exitCode);
  }
})();
