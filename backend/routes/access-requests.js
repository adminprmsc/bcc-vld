const express = require('express');
const router = express.Router();
const { AccessRequest, User } = require('../models-sql');
const auth = require('../middleware/auth');
const crypto = require('crypto');

function requireAdmin(req, res, next) {
  const role = req.user?.role;
  if (!role || (role !== 'Super Admin' && role !== 'Admin')) {
    return res.status(403).json({ msg: 'Forbidden' });
  }
  next();
}

function generateTempPassword() {
  return `Temp#${crypto.randomBytes(4).toString('hex')}`;
}

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, roleRequested, tehsil, message } = req.body || {};
    if (!name || !email || !phone) {
      return res.status(400).json({ msg: 'Name, email, and phone are required.' });
    }
    const normalisedEmail = email.toString().trim().toLowerCase();
    const existingUser = await User.findOne({ where: { email: normalisedEmail } });
    if (existingUser) {
      return res.status(409).json({ msg: 'An account with this email already exists. Please contact an administrator.' });
    }
    const pendingRequest = await AccessRequest.findOne({ where: { email: normalisedEmail, status: 'Pending' } });
    if (pendingRequest) {
      return res.status(409).json({ msg: 'A request for this email is already pending review.' });
    }
    const accessRequest = await AccessRequest.create({
      name: name.toString().trim(),
      email: normalisedEmail,
      phone: phone.toString().trim(),
      roleRequested: roleRequested || 'Citizen',
      tehsil: tehsil?.toString().trim() || '',
      message: message?.toString().trim() || ''
    });
    res.status(201).json({
      msg: 'Request received. An administrator will review your submission shortly.',
      request: accessRequest
    });
  } catch (err) {
    console.error('[access-requests.post] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const requests = await AccessRequest.findAll({ order: [['createdAt', 'DESC']] });
    res.json(requests);
  } catch (err) {
    console.error('[access-requests.get] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

router.patch('/:id/approve', auth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { notes, role } = req.body || {};
    const request = await AccessRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ msg: 'Request not found.' });
    }
    if (request.status === 'Approved') {
      return res.status(400).json({ msg: 'Request already approved.' });
    }
    if (request.status === 'Rejected') {
      return res.status(400).json({ msg: 'Request already rejected.' });
    }
    const normalisedEmail = request.email.toLowerCase();
    let user = await User.findOne({ where: { email: normalisedEmail } });
    let tempPassword;
    if (!user) {
      tempPassword = generateTempPassword();
      user = await User.create({
        name: request.name,
        email: normalisedEmail,
        phone: request.phone,
        role: role || request.roleRequested || 'Citizen',
        address: request.tehsil || '',
        password: tempPassword,
        activeStatus: 'inactive'
      });
    }
    request.status = 'Approved';
    request.processedBy = req.user?.userId || null;
    request.processedAt = new Date();
    request.processedNotes = (notes || '').toString().trim();
    await request.save();
    res.json({
      msg: 'Request approved successfully.',
      request,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        activeStatus: user.activeStatus
      },
      tempPassword
    });
  } catch (err) {
    console.error('[access-requests.approve] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

router.patch('/:id/reject', auth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { notes } = req.body || {};
    const request = await AccessRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ msg: 'Request not found.' });
    }
    if (request.status === 'Approved') {
      return res.status(400).json({ msg: 'Request already approved.' });
    }
    if (request.status === 'Rejected') {
      return res.status(400).json({ msg: 'Request already rejected.' });
    }
    request.status = 'Rejected';
    request.processedBy = req.user?.userId || null;
    request.processedAt = new Date();
    request.processedNotes = (notes || '').toString().trim();
    await request.save();
    res.json({ msg: 'Request rejected.', request });
  } catch (err) {
    console.error('[access-requests.reject] error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
