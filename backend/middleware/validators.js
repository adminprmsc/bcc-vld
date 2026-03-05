/**
 * Centralized validation middleware using express-validator
 * Provides reusable validation chains for common data types
 */
const { body, param, query, validationResult } = require('express-validator');

// Pakistan coordinate bounds
const PAKISTAN_BOUNDS = {
  lat: { min: 23.5, max: 37.5 },
  lng: { min: 60.5, max: 77.5 }
};

// Valid roles in the system
const VALID_ROLES = [
  'Super Admin', 'Admin', 'DM Tehsil', 'Infra Engineer', 'CID', 
  'BCC Specialist', 'BCC Officer Tehsil', 'EDCS Consultant', 'EDCS User', 
  'RA Environment', 'PCRWR Sampler', 'PCRWR Lab', 'Tehsil Manager', 'Citizen'
];

// Sanitization helpers
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/<[^>]*>/g, ''); // Remove HTML tags
};

const sanitizeHtml = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      msg: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Coordinate validation - validates lat/lng within Pakistan bounds
 */
const validateCoordinates = (latField = 'lat', lngField = 'lng', optional = false) => {
  const latValidation = body(latField)
    .custom((value, { req }) => {
      // Allow empty if optional
      if (optional && (value === undefined || value === null || value === '')) {
        return true;
      }
      const lat = parseFloat(value);
      if (isNaN(lat)) {
        throw new Error('Latitude must be a valid number');
      }
      if (lat < PAKISTAN_BOUNDS.lat.min || lat > PAKISTAN_BOUNDS.lat.max) {
        throw new Error(`Latitude must be between ${PAKISTAN_BOUNDS.lat.min} and ${PAKISTAN_BOUNDS.lat.max}`);
      }
      return true;
    });

  const lngValidation = body(lngField)
    .custom((value, { req }) => {
      if (optional && (value === undefined || value === null || value === '')) {
        return true;
      }
      const lng = parseFloat(value);
      if (isNaN(lng)) {
        throw new Error('Longitude must be a valid number');
      }
      if (lng < PAKISTAN_BOUNDS.lng.min || lng > PAKISTAN_BOUNDS.lng.max) {
        throw new Error(`Longitude must be between ${PAKISTAN_BOUNDS.lng.min} and ${PAKISTAN_BOUNDS.lng.max}`);
      }
      return true;
    });

  return [latValidation, lngValidation];
};

/**
 * Validate nested coordinate objects (e.g., location.coordinates.lat)
 */
const validateNestedCoordinates = (basePath, optional = true) => {
  return [
    body(`${basePath}.lat`)
      .optional()
      .custom((value) => {
        if (value === undefined || value === null || value === '') return true;
        const lat = parseFloat(value);
        if (isNaN(lat)) throw new Error('Latitude must be a valid number');
        if (lat < PAKISTAN_BOUNDS.lat.min || lat > PAKISTAN_BOUNDS.lat.max) {
          throw new Error(`Latitude must be between ${PAKISTAN_BOUNDS.lat.min} and ${PAKISTAN_BOUNDS.lat.max}`);
        }
        return true;
      }),
    body(`${basePath}.lng`)
      .optional()
      .custom((value) => {
        if (value === undefined || value === null || value === '') return true;
        const lng = parseFloat(value);
        if (isNaN(lng)) throw new Error('Longitude must be a valid number');
        if (lng < PAKISTAN_BOUNDS.lng.min || lng > PAKISTAN_BOUNDS.lng.max) {
          throw new Error(`Longitude must be between ${PAKISTAN_BOUNDS.lng.min} and ${PAKISTAN_BOUNDS.lng.max}`);
        }
        return true;
      })
  ];
};

/**
 * GeoJSON geometry validation
 */
const validateGeoJSON = (field = 'feature.geometry') => {
  return body(field).custom((geometry) => {
    if (!geometry) {
      throw new Error('Geometry is required');
    }
    
    const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
    if (!validTypes.includes(geometry.type)) {
      throw new Error(`Invalid geometry type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    if (!geometry.coordinates) {
      throw new Error('Coordinates are required');
    }
    
    // Validate coordinates based on type
    const validateCoord = (coord) => {
      if (!Array.isArray(coord) || coord.length < 2) {
        throw new Error('Invalid coordinate format');
      }
      const [lng, lat] = coord;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new Error('Coordinates must be numbers');
      }
      // Basic bounds check
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Coordinates out of valid range');
      }
    };
    
    const validateCoords = (coords, depth = 0) => {
      if (depth > 3) throw new Error('Geometry too deeply nested');
      if (!Array.isArray(coords)) throw new Error('Invalid coordinates structure');
      
      if (geometry.type === 'Point' && depth === 0) {
        validateCoord(coords);
      } else if (Array.isArray(coords[0]) && typeof coords[0][0] !== 'number') {
        coords.forEach(c => validateCoords(c, depth + 1));
      } else if (Array.isArray(coords[0])) {
        coords.forEach(validateCoord);
      } else {
        validateCoord(coords);
      }
    };
    
    validateCoords(geometry.coordinates);
    return true;
  });
};

/**
 * Integer ID validation (MySQL primary keys)
 */
const validateObjectId = (field, optional = false) => {
  const validation = param(field).custom((value) => {
    if (optional && !value) return true;
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1) {
      throw new Error(`Invalid ${field} format`);
    }
    return true;
  });
  return optional ? validation.optional() : validation;
};

const validateBodyObjectId = (field, optional = false) => {
  const validation = body(field).custom((value) => {
    if (optional && !value) return true;
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1) {
      throw new Error(`Invalid ${field} format`);
    }
    return true;
  });
  return optional ? validation.optional() : validation;
};

/**
 * User validation chains
 */
const userValidation = {
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
      .customSanitizer(sanitizeString),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('role')
      .trim()
      .isIn(VALID_ROLES).withMessage('Invalid role'),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+92|0)?[0-9]{10,11}$/).withMessage('Invalid Pakistani phone number'),
    body('cnic')
      .optional()
      .trim()
      .matches(/^[0-9]{5}-[0-9]{7}-[0-9]{1}$/).withMessage('CNIC must be in format XXXXX-XXXXXXX-X')
  ],
  
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format'),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
      .customSanitizer(sanitizeString),
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('role')
      .optional()
      .trim()
      .isIn(VALID_ROLES).withMessage('Invalid role'),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+92|0)?[0-9]{10,11}$/).withMessage('Invalid Pakistani phone number'),
    body('cnic')
      .optional()
      .trim()
      .matches(/^[0-9]{5}-[0-9]{7}-[0-9]{1}$/).withMessage('CNIC must be in format XXXXX-XXXXXXX-X')
  ]
};

/**
 * Requisition validation chains
 */
const requisitionValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters')
      .customSanitizer(sanitizeString),
    body('purpose')
      .trim()
      .notEmpty().withMessage('Purpose is required')
      .isLength({ min: 10, max: 1000 }).withMessage('Purpose must be 10-1000 characters')
      .customSanitizer(sanitizeString),
    body('tehsil')
      .trim()
      .notEmpty().withMessage('Tehsil is required')
      .customSanitizer(sanitizeString),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 }).withMessage('Description must be under 5000 characters')
      .customSanitizer(sanitizeString),
    body('landArea')
      .optional()
      .trim()
      .customSanitizer(sanitizeString),
    ...validateNestedCoordinates('location.coordinates'),
    ...validateNestedCoordinates('mapMarker')
  ],
  
  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters')
      .customSanitizer(sanitizeString),
    body('purpose')
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 }).withMessage('Purpose must be 10-1000 characters')
      .customSanitizer(sanitizeString),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 }).withMessage('Description must be under 5000 characters')
      .customSanitizer(sanitizeString),
    ...validateNestedCoordinates('location.coordinates'),
    ...validateNestedCoordinates('mapMarker')
  ]
};

/**
 * Water quality sample validation
 */
const waterQualityValidation = {
  create: [
    validateBodyObjectId('plan').withMessage('Valid plan ID is required'),
    body('sampleDate')
      .optional()
      .isISO8601().withMessage('Invalid date format'),
    body('parameters')
      .optional()
      .isObject().withMessage('Parameters must be an object'),
    body('parameters.ph')
      .optional()
      .isFloat({ min: 0, max: 14 }).withMessage('pH must be between 0 and 14'),
    body('parameters.turbidity')
      .optional()
      .isFloat({ min: 0 }).withMessage('Turbidity must be a positive number'),
    body('parameters.tds')
      .optional()
      .isFloat({ min: 0 }).withMessage('TDS must be a positive number'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 2000 }).withMessage('Notes must be under 2000 characters')
      .customSanitizer(sanitizeString)
  ],
  
  updateLabResults: [
    body('labResults')
      .isObject().withMessage('Lab results must be an object'),
    body('labResults.ph')
      .optional()
      .isFloat({ min: 0, max: 14 }).withMessage('pH must be between 0 and 14'),
    body('labResults.arsenic')
      .optional()
      .isFloat({ min: 0 }).withMessage('Arsenic must be a positive number'),
    body('labResults.fluoride')
      .optional()
      .isFloat({ min: 0 }).withMessage('Fluoride must be a positive number'),
    body('labResults.nitrate')
      .optional()
      .isFloat({ min: 0 }).withMessage('Nitrate must be a positive number'),
    body('labResults.coliform')
      .optional()
      .isFloat({ min: 0 }).withMessage('Coliform must be a positive number')
  ]
};

/**
 * Consultant plan validation
 */
const consultantPlanValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters')
      .customSanitizer(sanitizeString),
    body('assetType')
      .trim()
      .notEmpty().withMessage('Asset type is required')
      .customSanitizer(sanitizeString),
    body('assetLabel')
      .trim()
      .notEmpty().withMessage('Asset label is required')
      .customSanitizer(sanitizeString),
    body('category')
      .trim()
      .notEmpty().withMessage('Category is required')
      .customSanitizer(sanitizeString),
    validateGeoJSON('feature.geometry'),
    body('tehsil')
      .optional()
      .trim()
      .customSanitizer(sanitizeString),
    body('district')
      .optional()
      .trim()
      .customSanitizer(sanitizeString)
  ],
  
  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters')
      .customSanitizer(sanitizeString),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 }).withMessage('Description must be under 5000 characters')
      .customSanitizer(sanitizeString)
  ]
};

/**
 * Query parameter validation
 */
const queryValidation = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200')
      .toInt()
  ],
  
  search: [
    query('query')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Search query must be under 100 characters')
      .customSanitizer(sanitizeString)
  ]
};

/**
 * Support request validation
 */
const supportValidation = {
  create: [
    body('subject')
      .trim()
      .notEmpty().withMessage('Subject is required')
      .isLength({ min: 5, max: 200 }).withMessage('Subject must be 5-200 characters')
      .customSanitizer(sanitizeString),
    body('description')
      .trim()
      .notEmpty().withMessage('Description is required')
      .isLength({ min: 20, max: 5000 }).withMessage('Description must be 20-5000 characters')
      .customSanitizer(sanitizeString),
    body('category')
      .trim()
      .notEmpty().withMessage('Category is required')
      .isIn(['Technical', 'Account', 'Feature Request', 'Bug Report', 'Other'])
      .withMessage('Invalid category'),
    body('priority')
      .optional()
      .isIn(['Low', 'Medium', 'High', 'Critical'])
      .withMessage('Invalid priority level')
  ],
  
  addResponse: [
    body('message')
      .trim()
      .notEmpty().withMessage('Message is required')
      .isLength({ min: 1, max: 5000 }).withMessage('Message must be 1-5000 characters')
      .customSanitizer(sanitizeString)
  ]
};

module.exports = {
  handleValidationErrors,
  validateCoordinates,
  validateNestedCoordinates,
  validateGeoJSON,
  validateObjectId,
  validateBodyObjectId,
  userValidation,
  requisitionValidation,
  waterQualityValidation,
  consultantPlanValidation,
  queryValidation,
  supportValidation,
  sanitizeString,
  sanitizeHtml,
  VALID_ROLES,
  PAKISTAN_BOUNDS
};
