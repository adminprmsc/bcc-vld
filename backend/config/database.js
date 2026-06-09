/**
 * MySQL database configuration — single source of truth for the application and Sequelize CLI.
 * All runtime code and migrations connect through this module.
 */
require('dotenv').config();

const { Sequelize } = require('sequelize');

const baseDefine = {
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

const baseDialectOptions = {
  dateStrings: true,
  typeCast: true
};

const mysqlConfig = {
  development: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    database: process.env.MYSQL_DATABASE || 'lds_db',
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    dialect: 'mysql',
    logging: console.log,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    define: baseDefine,
    dialectOptions: baseDialectOptions,
    timezone: '+05:00'
  },
  test: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    database: process.env.MYSQL_TEST_DATABASE || 'lds_db_test',
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    dialect: 'mysql',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: baseDefine,
    dialectOptions: baseDialectOptions,
    timezone: '+05:00'
  },
  production: {
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    database: process.env.MYSQL_DATABASE,
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    dialect: 'mysql',
    logging: false,
    pool: { max: 20, min: 5, acquire: 60000, idle: 10000 },
    define: baseDefine,
    dialectOptions: {
      ...baseDialectOptions,
      ssl: process.env.MYSQL_SSL === 'true'
        ? { require: true, rejectUnauthorized: false }
        : false
    },
    timezone: '+05:00'
  }
};

const env = process.env.NODE_ENV || 'development';
const config = mysqlConfig[env];

if (env === 'production') {
  const required = ['MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required MySQL environment variables: ${missing.join(', ')}`);
  }
}

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: env === 'development' ? config.logging : false,
  pool: config.pool,
  define: config.define,
  dialectOptions: config.dialectOptions,
  timezone: config.timezone
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to MySQL database:', error.message);
    return false;
  }
}

function getConnectionSummary() {
  return {
    dialect: 'mysql',
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username
  };
}

module.exports = {
  sequelize,
  Sequelize,
  DataTypes: Sequelize.DataTypes,
  testConnection,
  getConnectionSummary,
  mysqlConfig
};
