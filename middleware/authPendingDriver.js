// middleware/authPendingDriver.js
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

const authenticatePendingDriver = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ← Yeh flexible banao – id ya userId dono accept kare
    const driverId = decoded.id || decoded.userId || decoded._id;
    if (!driverId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Ab yeh check bilkul sahi hai!
    if (driver.profileStatus !== 'pending_pin_setup') {
      return res.status(403).json({ 
        message: 'Invalid status. Expected: pending_pin_setup',
        currentStatus: driver.profileStatus 
      });
    }

    req.user = driver;
    next();

  } catch (error) {
    console.error('Auth Pending Driver Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { authenticatePendingDriver };