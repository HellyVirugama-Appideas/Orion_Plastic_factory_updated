/**
 * ONE-TIME MIGRATION SCRIPT
 * -----------------------------------------------------------------------
 * Fixes existing Delivery records that were created BEFORE the
 * `originalPickupLocation` field was added to the Delivery schema.
 *
 * Bug recap: the controller always tried to save `originalPickupLocation`
 * on delivery creation, but the field didn't exist in the Mongoose schema
 * yet, so Mongoose silently stripped it (strict mode). Every existing
 * delivery in the DB therefore has `originalPickupLocation: undefined`,
 * which makes `resolveFactoryLocation()` always fall back to the default
 * master Pickup Location (Ahmedabad) on the delivery-details page,
 * regardless of the order's real pickup location.
 *
 * This script re-links each delivery to its Order (via
 * delivery.orderId === order.orderNumber) and backfills
 * originalPickupLocation from order.pickupLocation.
 *
 * Usage:
 *   node scripts/backfillOriginalPickupLocation.js
 *
 * Safe to re-run: it only touches deliveries where originalPickupLocation
 * is missing/empty.
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');

async function run() {
  await connectDB();

  const deliveries = await Delivery.find({
    $or: [
      { originalPickupLocation: { $exists: false } },
      { 'originalPickupLocation.address': { $exists: false } },
      { 'originalPickupLocation.coordinates.latitude': { $exists: false } }
    ]
  });

  console.log(`Found ${deliveries.length} delivery(ies) missing originalPickupLocation.`);

  let fixed = 0;
  let skipped = 0;

  for (const delivery of deliveries) {
    const order = await Order.findOne({ orderNumber: delivery.orderId }).lean();

    if (!order?.pickupLocation?.address || !order?.pickupLocation?.coordinates?.latitude) {
      console.warn(`⚠️  Skipping ${delivery.trackingNumber} (orderId: ${delivery.orderId}) — order or its pickupLocation not found/incomplete.`);
      skipped++;
      continue;
    }

    delivery.originalPickupLocation = order.pickupLocation;
    await delivery.save();
    fixed++;
    console.log(`✅ Fixed ${delivery.trackingNumber} → ${order.pickupLocation.address}`);
  }

  console.log(`\nDone. Fixed: ${fixed}, Skipped: ${skipped}, Total scanned: ${deliveries.length}`);
  await mongoose.connection.close();
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});