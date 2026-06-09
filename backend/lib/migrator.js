/**
 * Sequelize migration runner — MySQL only, uses config/database.js
 */
const { execSync } = require('child_process');
const path = require('path');
const { testConnection, sequelize } = require('../config/database');

const BACKEND_ROOT = path.join(__dirname, '..');

function runCli(command) {
  const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' };
  execSync(`npx sequelize-cli ${command}`, {
    cwd: BACKEND_ROOT,
    stdio: 'inherit',
    env
  });
}

async function getMigrationStatus() {
  try {
    const [rows] = await sequelize.query(
      'SELECT name FROM SequelizeMeta ORDER BY name'
    );
    return rows.map((r) => r.name);
  } catch (err) {
    if (err.original && err.original.code === 'ER_NO_SUCH_TABLE') {
      return [];
    }
    throw err;
  }
}

async function runPendingMigrations() {
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Database unreachable — cannot run migrations');
  }

  const applied = await getMigrationStatus();
  console.log(
    applied.length
      ? `Migrations applied: ${applied.length} (${applied[applied.length - 1]})`
      : 'No migrations applied yet'
  );

  console.log('Running pending migrations...');
  runCli('db:migrate');
  console.log('✅ Migrations complete.');
}

async function migrationStatus() {
  await testConnection();
  runCli('db:migrate:status');
}

module.exports = {
  runPendingMigrations,
  migrationStatus,
  getMigrationStatus
};
