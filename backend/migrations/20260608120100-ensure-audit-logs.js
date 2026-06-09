'use strict';

const { tableExists, materializeModel } = require('../lib/schema');

/** Additive migration for databases created before audit_logs was in the baseline. */
module.exports = {
  async up() {
    if (await tableExists('audit_logs')) {
      console.log('audit_logs already exists — skipping');
      return;
    }

    await materializeModel('../models-sql/AuditLog');
    console.log('Created audit_logs table');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  }
};
