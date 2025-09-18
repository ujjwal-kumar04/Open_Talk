const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_strong_secret';

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password, gender } = req.body;
    if (!username || !password || !gender) {
      return res.status(400).json({ msg: 'Missing fields' });
    }

    // Check gender is valid
    if (!['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ msg: 'Invalid gender value' });
    }

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ msg: 'Username already taken' });

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ username, password: hashed, gender });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: { id: user._id, username: user.username, gender: user.gender }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ msg: 'Missing fields' });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: { id: user._id, username: user.username, gender: user.gender }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
