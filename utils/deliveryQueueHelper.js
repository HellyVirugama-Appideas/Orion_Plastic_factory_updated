const mongoose = require('mongoose');
const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const { calculateDistance } = require('./geoHelper');

/**
 * Driver ki saari active deliveries (assigned / In_transit / Arrived) ko
 * uski current location (live socket location ya DB location) se
 * distance ke hisaab se ascending order mein sort karke return karta hai.
 *
 * @param {String|ObjectId} driverId
 * @param {Object|null} liveLocation - { latitude, longitude } agar in-memory se pass karna ho
 * @returns {Array} sorted deliveries with distanceFromDriver (in km)
 */
async function getSortedDeliveryQueueForDriver(driverId, liveLocation = null) {
  try {
    let currentLoc = liveLocation;

    // Agar live location nahi mila to DB se fallback karo
    if (!currentLoc?.latitude || !currentLoc?.longitude) {
      const driverDoc = await Driver.findById(driverId).select('currentLocation');
      currentLoc = driverDoc?.currentLocation || null;
    }

    const deliveries = await Delivery.find({
      driverId,
      status: { $in: ['assigned', 'In_transit', 'Arrived'] }
    })
      .populate('customerId', 'name companyName phone')
      .lean();

    // Driver ka location abhi tak available nahi — original order hi return karo
    if (!currentLoc?.latitude || !currentLoc?.longitude) {
      return deliveries.map(d => ({ ...d, distanceFromDriver: null }));
    }

    const withDistance = deliveries.map(d => {
      const destCoords = d.deliveryLocation?.coordinates;
      let distance = Infinity;

      if (destCoords?.latitude && destCoords?.longitude) {
        distance = calculateDistance(
          currentLoc.latitude,
          currentLoc.longitude,
          destCoords.latitude,
          destCoords.longitude
        );
      }

      return {
        ...d,
        distanceFromDriver: distance === Infinity ? null : parseFloat(distance.toFixed(2))
      };
    });

    // Sabse kam distance wali sabse pehle (closest first)
    withDistance.sort((a, b) => {
      if (a.distanceFromDriver === null) return 1;
      if (b.distanceFromDriver === null) return -1;
      return a.distanceFromDriver - b.distanceFromDriver;
    });

    return withDistance;
  } catch (err) {
    console.error('[QUEUE-HELPER] getSortedDeliveryQueueForDriver error:', err.message);
    return [];
  }
}

module.exports = { getSortedDeliveryQueueForDriver };