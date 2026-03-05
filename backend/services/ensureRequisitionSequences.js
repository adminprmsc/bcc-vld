const Requisition = require('../models/Requisition');

async function ensureRequisitionSequences() {
  const query = {
    $or: [{ sequenceNumber: { $exists: false } }, { sequenceNumber: null }]
  };
  const requisitions = await Requisition.find(query).sort({ _id: 1 });
  if (!requisitions.length) {
    return;
  }
  for (const requisition of requisitions) {
    if (requisition.sequenceNumber != null) {
      continue;
    }
    await requisition.save();
  }
  console.log(`[sequence] Assigned numeric ids to ${requisitions.length} requisition(s).`);
}

module.exports = ensureRequisitionSequences;
