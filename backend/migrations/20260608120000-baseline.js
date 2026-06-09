'use strict';

const { tableExists, materializeFullSchema } = require('../lib/schema');

/** Initial schema — runs only when the database has no application tables yet. */
module.exports = {
  async up() {
    if (await tableExists('users')) {
      console.log('Baseline: schema already present — skipping');
      return;
    }

    console.log('Baseline: creating initial MySQL schema from models-sql/');
    await materializeFullSchema();
    console.log('Baseline: complete');
  },

  async down() {
    throw new Error('Baseline migration cannot be reverted in production');
  }
};
