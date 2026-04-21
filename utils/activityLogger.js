const DriverActivityLog = require('../models/DriverActivityLog'); 

exports.logDriverActivity = async (driverId, action, meta = {}, req = null) => {
  try {
    const logEntry = {
      driverId,
      action,
      meta: {
        ...meta,
        timestamp: new Date().toISOString(),
        ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
        userAgent: req?.headers?.['user-agent'] || 'unknown'
      }
    };

    await new DriverActivityLog(logEntry).save();
    console.log(`[DRIVER LOG] ${action} logged for driver ${driverId}`);
  } catch (error) {
    console.error('[DRIVER LOG ERROR]', error.message);
  }
};