const User = require('../models/User');

async function ensureUserSimpleIds() {
  const query = {
    $or: [{ simpleId: { $exists: false } }, { simpleId: null }]
  };
  const users = await User.find(query).sort({ _id: 1 });
  if (!users.length) {
    return;
  }
  for (const user of users) {
    if (user.simpleId != null) {
      continue;
    }
    await user.save();
  }
  console.log(`[simple-id] Assigned numeric ids to ${users.length} user(s).`);
}

module.exports = ensureUserSimpleIds;
