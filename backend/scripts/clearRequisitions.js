const mongoose = require('mongoose');
const Requisition = require('../models/Requisition');

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/landdonation', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const result = await Requisition.deleteMany({});
    console.log(`Deleted ${result.deletedCount} requisition(s).`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to clear requisitions:', err);
    process.exit(1);
  }
})();
