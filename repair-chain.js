// repair-chain.js
// Project root me rakho, phir chalao: node repair-chain.js
//
// Yeh script driver ki saari ACTIVE (non-delivered/cancelled) deliveries
// ko GREEDY NEAREST-NEIGHBOR order me rebuild karta hai — bilkul wahi
// logic jo ab har naye order-assignment par automatically chalta hai
// (deliveryAdminController.js -> rebuildDriverRouteChain):
//
//   1) Pehla stop = driver ki ABHI ki live location se sabse NEAREST
//      delivery — pickup = Factory (originalPickupLocation).
//   2) Har agla stop = pichle stop ke dropoff se sabse NEAREST baaki
//      delivery — pickup = pichle stop ka dropoff.

require('dotenv').config();
const mongoose = require('mongoose');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const { calculateDistance } = require('./utils/geoHelper');

// ⚠️ Yahan apna driverId daalo
const DRIVER_ID = 'PUT_DRIVER_ID_HERE';

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const driver = await Driver.findById(DRIVER_ID).select('currentLocation');
  let currentPoint = (driver?.currentLocation?.latitude && driver?.currentLocation?.longitude)
    ? { latitude: driver.currentLocation.latitude, longitude: driver.currentLocation.longitude }
    : null;

  console.log('Driver current location:', currentPoint || 'NOT AVAILABLE (creation-order fallback use hoga)');

  const activeDeliveries = await Delivery.find({
    driverId: DRIVER_ID,
    status: { $nin: ['delivered', 'completed', 'cancelled', 'Delivered', 'Completed', 'Cancelled'] }
  }).sort({ createdAt: 1 });

  if (activeDeliveries.length === 0) {
    console.log('Koi active delivery nahi mili is driver ke liye.');
    process.exit(0);
  }

  const remaining = [...activeDeliveries];
  const orderedChain = [];

  while (remaining.length > 0) {
    let nextIndex = 0;

    if (currentPoint) {
      let minDist = Infinity;
      remaining.forEach((del, idx) => {
        const coords = del.deliveryLocation?.coordinates;
        if (coords?.latitude && coords?.longitude) {
          const dist = calculateDistance(currentPoint.latitude, currentPoint.longitude, coords.latitude, coords.longitude);
          if (dist < minDist) {
            minDist = dist;
            nextIndex = idx;
          }
        }
      });
    }

    const chosen = remaining.splice(nextIndex, 1)[0];
    orderedChain.push(chosen);

    const chosenCoords = chosen.deliveryLocation?.coordinates;
    if (chosenCoords?.latitude && chosenCoords?.longitude) {
      currentPoint = { latitude: chosenCoords.latitude, longitude: chosenCoords.longitude };
    }
  }

  console.log(`\nRebuilt order: ${orderedChain.map(d => d.trackingNumber).join(' → ')}\n`);

  for (let i = 0; i < orderedChain.length; i++) {
    const cur = orderedChain[i];
    const prev = i > 0 ? orderedChain[i - 1] : null;
    const next = i < orderedChain.length - 1 ? orderedChain[i + 1] : null;

    cur.previousDeliveryId = prev ? prev._id : null;
    cur.nextDeliveryId = next ? next._id : null;

    if (prev) {
      cur.pickupLocation = {
        address: prev.deliveryLocation.address,
        contactPerson: prev.deliveryLocation.contactPerson,
        contactPhone: prev.deliveryLocation.contactPhone,
        city: prev.deliveryLocation.city,
        state: prev.deliveryLocation.state,
        pincode: prev.deliveryLocation.pincode,
        landmark: prev.deliveryLocation.landmark,
        coordinates: prev.deliveryLocation.coordinates
      };
    } else if (cur.originalPickupLocation?.address) {
      cur.pickupLocation = cur.originalPickupLocation;
    } else {
      console.warn(`⚠️  ${cur.trackingNumber} — originalPickupLocation missing! Manually "Manage Pickup Locations" se address fix karo.`);
    }

    await cur.save();

    console.log(
      `#${i + 1} ${cur.trackingNumber} | ` +
      `pickup: ${cur.pickupLocation?.address || 'MISSING'} | ` +
      `delivery: ${cur.deliveryLocation?.address} | ` +
      `prev: ${prev?.trackingNumber || 'FACTORY'} | ` +
      `next: ${next?.trackingNumber || 'END'}`
    );
  }

  console.log('\n✅ Chain rebuild complete.');
  await mongoose.disconnect();
})().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});