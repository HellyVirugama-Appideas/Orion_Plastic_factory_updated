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
      console.warn(`⚠️  Skipping ${delivery.trackingNumber} — order/pickupLocation incomplete.`);
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