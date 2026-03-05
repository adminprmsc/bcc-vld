require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const rateLimit = require('express-rate-limit');

// MySQL / Sequelize
const { sequelize, testConnection, syncDatabase } = require('./config/database');

// Security middleware
let helmet;
try {
  helmet = require('helmet');
} catch (e) {
  console.warn('helmet not installed - security headers will not be applied');
}

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

// Audit logging
const { auditMiddleware, auditErrorHandler } = require('./middleware/audit');
const auditLogsRouter = require('./routes/audit-logs');

// Validate critical environment variables in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable must be set in production');
  process.exit(1);
}

const app = express();

// Security headers
if (helmet) {
  app.use(helmet({
    contentSecurityPolicy: false, // Configure based on your needs
    crossOriginEmbedderPolicy: false
  }));
}

// CORS Configuration - restrict origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:4200', 'http://localhost:3000', 'http://127.0.0.1:4200'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - protect against brute force attacks
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: { msg: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: { msg: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalLimiter);

// MySQL connection & schema sync
(async () => {
  try {
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Could not connect to MySQL. Server will start but DB queries will fail.');
      return;
    }
    // Sync schema (alter: true adds missing columns/tables without dropping data)
    await syncDatabase({ alter: false });
  } catch (err) {
    console.error('MySQL initialisation error:', err.message);
  }
})();

app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply audit middleware to capture all API actions
app.use(auditMiddleware);

// Health check endpoint for monitoring
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch (_) { /* ignore */ }
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mysql: dbStatus
  };
  res.status(200).json(healthCheck);
});

app.use('/', indexRouter);

// Apply stricter rate limiting to authentication endpoints
app.use('/users/login', authLimiter);
app.use('/users/register', authLimiter);
app.use('/users', usersRouter);
app.use('/requisition', require('./routes/requisition'));
app.use('/support', require('./routes/support'));
app.use('/access-requests', require('./routes/access-requests'));
app.use('/consultant-plans', require('./routes/consultant-plans'));
app.use('/water-quality-samples', require('./routes/water-quality-samples'));
app.use('/mobile', require('./routes/mobile'));
app.use('/audit-logs', auditLogsRouter);

// Audit error handler - logs errors before passing to main error handler
app.use(auditErrorHandler);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  // Log error for debugging
  console.error('Server Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ msg: 'CORS policy violation' });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ msg: 'Validation error', errors: err.errors });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ msg: 'Authentication failed' });
  }

  // Default server error - don't leak stack traces in production
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Internal server error';
  
  res.status(statusCode).json({ msg: message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ msg: 'Route not found' });
});

module.exports = app;
