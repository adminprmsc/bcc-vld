// MongoDB initialization script for Docker
// This script runs on first container start

// Switch to landdonation database
db = db.getSiblingDB('landdonation');

// Create application user with read/write access
db.createUser({
  user: process.env.MONGO_USER || 'lds_user',
  pwd: process.env.MONGO_PASSWORD || 'lds_password',
  roles: [
    {
      role: 'readWrite',
      db: 'landdonation'
    }
  ]
});

// Create indexes for better query performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ tehsil: 1 });
db.users.createIndex({ simpleId: 1 }, { unique: true, sparse: true });

db.requisitions.createIndex({ tehsil: 1 });
db.requisitions.createIndex({ status: 1 });
db.requisitions.createIndex({ requestedBy: 1 });
db.requisitions.createIndex({ sequenceNumber: 1 }, { unique: true, sparse: true });
db.requisitions.createIndex({ dateCreated: -1 });

db.consultantplans.createIndex({ tehsil: 1 });
db.consultantplans.createIndex({ category: 1 });
db.consultantplans.createIndex({ status: 1 });
db.consultantplans.createIndex({ criticalFlag: 1 });
db.consultantplans.createIndex({ 'feature.geometry': '2dsphere' });

db.waterqualitysamples.createIndex({ plan: 1 });
db.waterqualitysamples.createIndex({ status: 1 });
db.waterqualitysamples.createIndex({ assignedSampler: 1 });
db.waterqualitysamples.createIndex({ createdAt: -1 });

db.supportrequests.createIndex({ status: 1 });
db.supportrequests.createIndex({ createdAt: -1 });

db.accessrequests.createIndex({ status: 1 });
db.accessrequests.createIndex({ email: 1 });

print('MongoDB initialization complete: indexes created');
