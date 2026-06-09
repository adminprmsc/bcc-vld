/**
 * Schema helpers for migrations only.
 * Runtime code must NOT call these — use migrations in backend/migrations/.
 */
const { sequelize } = require('../config/database');

function loadModels() {
  require('../models-sql');
}

async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    { replacements: [tableName] }
  );
  return Number(rows[0].cnt) > 0;
}

/**
 * Materialize all ORM models as tables (fresh install / baseline migration only).
 */
async function materializeFullSchema() {
  loadModels();
  await sequelize.sync();
}

/**
 * Materialize a single model table (additive migrations only).
 */
async function materializeModel(modulePath) {
  const Model = require(modulePath);
  await Model.sync();
}

module.exports = {
  loadModels,
  tableExists,
  materializeFullSchema,
  materializeModel
};
