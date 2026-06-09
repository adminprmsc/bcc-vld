#!/usr/bin/env node
/**
 * Run pending MySQL migrations (Sequelize CLI)
 * Usage: node scripts/run-migrations.js [status]
 */
const { runPendingMigrations, migrationStatus } = require('../lib/migrator');

async function main() {
  const command = process.argv[2] || 'up';

  if (command === 'status') {
    await migrationStatus();
    return;
  }

  await runPendingMigrations();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
