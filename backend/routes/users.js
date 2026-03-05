const express = require('express');
const router = express.Router();
const { User } = require('../models-sql');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRole } = auth;
const { Op } = require('sequelize');

function generateTempPassword() {
  return `Temp#${crypto.randomBytes(4).toString('hex')}`;
}

// GET /users?query= - list or search users
router.get('/', auth, async (req, res) => {
  try {
    const q = (req.query.query || '').toString().trim();
    const requesterRole = req.user?.role || '';
    const isPrivileged = ['Super Admin', 'Admin'].includes(requesterRole);
    if (!q && !isPrivileged) {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    const where = q
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${q}%` } },
            { role: { [Op.like]: `%${q}%` } },
            { email: { [Op.like]: `%${q}%` } }
          ]
        }
      : {};
    const limit = q ? 50 : 200;
    const attributes = q
      ? ['id', 'simpleId', 'name', 'role', 'email', 'activeStatus', 'gender', 'cnic', 'cnicExpiry', 'address', 'dob', 'phone']
      : { exclude: ['password'] };
    const users = await User.findAll({ where, attributes, limit });
    const serialized = users.map(user => ({
      id: user.id,
      numericId: user.simpleId ?? null,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender || '',
      cnic: user.cnic || '',
      cnicExpiry: user.cnicExpiry || '',
      address: user.address || '',
      dob: user.dob || '',
      phone: user.phone || '',
      activeStatus: user.activeStatus || ''
    }));
    res.json(serialized);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Register a new user
router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['Super Admin', 'Admin', 'DM Tehsil', 'Infra Engineer', 'CID', 'BCC Specialist', 'BCC Officer Tehsil', 'EDCS Consultant', 'EDCS User', 'RA Environment', 'PCRWR Sampler', 'PCRWR Lab', 'Tehsil Manager', 'Citizen'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, email, password, role, gender, cnic, cnicExpiry, address, dob, phone } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    const user = await User.create({ name, email, password, role, gender, cnic, cnicExpiry, address, dob, phone });
    res.status(201).json({ msg: 'User registered successfully', numericId: user.simpleId });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Admin create user
router.post('/', auth, requireRole('Super Admin', 'Admin'), [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('role').isIn(['Super Admin', 'Admin', 'DM Tehsil', 'Infra Engineer', 'CID', 'BCC Specialist', 'BCC Officer Tehsil', 'EDCS Consultant', 'EDCS User', 'RA Environment', 'PCRWR Sampler', 'PCRWR Lab', 'Tehsil Manager', 'Citizen'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, email, password, role, gender, cnic, cnicExpiry, address, dob, phone, activeStatus } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    const passwordToSet = password || generateTempPassword();
    const user = await User.create({
      name,
      email,
      password: passwordToSet,
      role,
      gender,
      cnic,
      cnicExpiry,
      address,
      dob,
      phone,
      activeStatus
    });
    const payload = {
      id: user.id,
      numericId: user.simpleId ?? null,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender || '',
      cnic: user.cnic || '',
      cnicExpiry: user.cnicExpiry || '',
      address: user.address || '',
      dob: user.dob || '',
      phone: user.phone || '',
      activeStatus: user.activeStatus || ''
    };
    if (!password) {
      payload.tempPassword = passwordToSet;
    }
    res.status(201).json(payload);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { email, password } = req.body;
    // Need to include password for comparison — findOne normally excludes it via toJSON
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, auth.JWT_SECRET, { expiresIn: '1d' });
    const sanitizedUser = {
      id: user.id,
      numericId: user.simpleId ?? null,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender || '',
      cnic: user.cnic || '',
      cnicExpiry: user.cnicExpiry || '',
      address: user.address || '',
      dob: user.dob || '',
      phone: user.phone || '',
      activeStatus: user.activeStatus || ''
    };
    res.json({ token, user: sanitizedUser });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get single user profile
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    const requesterId = req.user?.userId?.toString();
    const requesterRole = req.user?.role;
    if (requesterId !== user.id.toString() && !['Super Admin', 'Admin'].includes(requesterRole)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    res.json({
      id: user.id,
      numericId: user.simpleId ?? null,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender || '',
      cnic: user.cnic || '',
      cnicExpiry: user.cnicExpiry || '',
      address: user.address || '',
      dob: user.dob || '',
      phone: user.phone || '',
      activeStatus: user.activeStatus || ''
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Update user profile
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    const requesterId = req.user?.userId?.toString();
    const requesterRole = req.user?.role;
    if (requesterId !== user.id.toString() && !['Super Admin', 'Admin'].includes(requesterRole)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    const allowed = new Set(['name', 'email', 'gender', 'cnic', 'cnicExpiry', 'address', 'dob', 'phone']);
    if (['Super Admin', 'Admin'].includes(requesterRole)) {
      allowed.add('role');
      allowed.add('activeStatus');
    }
    const updates = {};
    allowed.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });
    if (req.body.password) {
      updates.password = req.body.password;
    }
    await user.update(updates);
    res.json({
      id: user.id,
      numericId: user.simpleId ?? null,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender || '',
      cnic: user.cnic || '',
      cnicExpiry: user.cnicExpiry || '',
      address: user.address || '',
      dob: user.dob || '',
      phone: user.phone || '',
      activeStatus: user.activeStatus || ''
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Delete user
router.delete('/:id', auth, requireRole('Super Admin', 'Admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    await user.destroy();
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Reset password
router.post('/:id/reset-password', auth, requireRole('Super Admin', 'Admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    const supplied = (req.body?.password || '').toString().trim();
    const nextPassword = supplied || generateTempPassword();
    await user.update({ password: nextPassword });
    res.json({ id: user.id, numericId: user.simpleId ?? null, tempPassword: supplied ? undefined : nextPassword });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
