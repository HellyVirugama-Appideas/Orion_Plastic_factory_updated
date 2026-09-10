// ================================================================
// ONE-TIME REPAIR SCRIPT — fixRouteChains.js
// ----------------------------------------------------------------
// Kya karta hai:
//   Priority-tier route chain FIX sirf FUTURE deliveries/priority-
//   changes pe apne aap chalta hai. Jo deliveries FIX aane se PEHLE
//   already create/assign ho chuki thi, unka pickupLocation chain
//   DB me abhi bhi PURANE (galat) order me stuck hai.
//
//   Ye script HAR driver ke liye jiski koi active delivery hai,
//   uska route chain (rebuildDriverRouteChain) turant recalculate
//   karke DB me save kar deta hai — priority-first order ke saath.
//
// Kaise chalayein (project root se):
//   node scripts/fixRouteChains.js
//
// Safe hai — sirf ACTIVE (delivered/completed/cancelled nahi) waali
// deliveries touch hoti hain, aur sirf pickupLocation/previous-
// DeliveryId/nextDeliveryId fields update hote hain.
// ================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Delivery = require('./models/Delivery');
const { rebuildDriverRouteChain } = require('./controllers/admin/deliveryAdminController');

const ACTIVE_STATUSES_EXCLUDED = ['delivered', 'completed', 'cancelled', 'Delivered', 'Completed', 'Cancelled'];

async function run() {
  await connectDB();

  const driverIds = await Delivery.distinct('driverId', {
    driverId: { $ne: null },
    status: { $nin: ACTIVE_STATUSES_EXCLUDED }
  });

  console.log(`\n[FIX-ROUTE-CHAINS] ${driverIds.length} driver(s) with active deliveries found.\n`);

  let success = 0;
  let failed = 0;

  for (const driverId of driverIds) {
    try {
      await rebuildDriverRouteChain(driverId);
      success++;
    } catch (err) {
      failed++;
      console.error(`[FIX-ROUTE-CHAINS] ❌ Failed for driver ${driverId}:`, err.message);
    }
  }

  console.log(`\n[FIX-ROUTE-CHAINS] Done. ✅ Success: ${success} | ❌ Failed: ${failed}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('[FIX-ROUTE-CHAINS] Fatal error:', err);
  process.exit(1);
});