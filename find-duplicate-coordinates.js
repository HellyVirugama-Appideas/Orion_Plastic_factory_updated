// // find-duplicate-coordinates.js
// //
// // USAGE:
// //   Isko apne project root mein rakho (jahan .env aur node_modules hain)
// //   fir run karo:  node find-duplicate-coordinates.js
// //
// // KYA KARTA HAI:
// //   Saari deliveries ki pickupLocation aur deliveryLocation coordinates
// //   ikattha karke dekhta hai ki kahin do alag deliveries ke coordinates
// //   EXACTLY same toh nahi hain (jo galat/duplicate address-entry ka
// //   signal hai). Jo bhi groups milte hain unhe print kar deta hai taaki
// //   aap seedha un specific deliveries ko DB/admin-panel mein jaakar
// //   check aur correct kar sako.

// require('dotenv').config();
// const mongoose = require('mongoose');
// const Delivery = require('./models/Delivery'); // path apne project ke hisaab se adjust karo agar zarurat ho

// async function run() {
//   await mongoose.connect(process.env.MONGO_URI);
//   console.log('✅ Connected to MongoDB\n');

//   const deliveries = await Delivery.find(
//     {},
//     'trackingNumber status pickupLocation deliveryLocation'
//   ).lean();

//   // key = "lat,lng" -> list of { trackingNumber, field }
//   const coordMap = new Map();

//   const addPoint = (delivery, field, loc) => {
//     const lat = loc?.coordinates?.latitude;
//     const lng = loc?.coordinates?.longitude;
//     if (lat === undefined || lng === undefined || lat === null || lng === null) return;

//     const key = `${lat},${lng}`;
//     if (!coordMap.has(key)) coordMap.set(key, []);
//     coordMap.get(key).push({
//       trackingNumber: delivery.trackingNumber,
//       status: delivery.status,
//       field,
//       address: loc.address || '(no address saved)'
//     });
//   };

//   deliveries.forEach(d => {
//     addPoint(d, 'pickupLocation', d.pickupLocation);
//     addPoint(d, 'deliveryLocation', d.deliveryLocation);
//   });

//   console.log('====== DUPLICATE COORDINATE GROUPS ======\n');
//   let foundAny = false;

//   for (const [coordKey, entries] of coordMap.entries()) {
//     // Sirf wahi groups dikhao jinme 2+ ALAG deliveries same coordinate share kar rahi hain
//     const uniqueTrackingNumbers = new Set(entries.map(e => e.trackingNumber));
//     if (uniqueTrackingNumbers.size > 1) {
//       foundAny = true;
//       console.log(`📍 Coordinates: ${coordKey}`);
//       entries.forEach(e => {
//         console.log(
//           `   - ${e.trackingNumber} | ${e.field} | status: ${e.status} | address: ${e.address}`
//         );
//       });
//       console.log('');
//     }
//   }

//   if (!foundAny) {
//     console.log('Koi duplicate coordinate group nahi mila — sab clean hai.');
//   } else {
//     console.log(
//       '⚠️  Upar dikhaye gaye groups mein 2+ alag deliveries ka ek hi exact\n' +
//       '   coordinate hai. In sab ko admin panel/DB mein check karo — jinke\n' +
//       '   address alag hain par coordinates same hain, unko re-geocode ya\n' +
//       '   manually correct karna hoga.'
//     );
//   }

//   await mongoose.disconnect();
// }

// run().catch(err => {
//   console.error('❌ Script failed:', err.message);
//   process.exit(1);
// });

/**
 * fix-order-status-sync.js
 *
 * PURPOSE:
 * Jab tak `autoReturnStaleDeliveries` mein Order-sync ka code nahi tha,
 * usse pehle jo deliveries "Returned_to_Factory" ho chuki thi, unke
 * linked Order ka status abhi bhi purana (jaise "assigned") atka hai.
 * Ye script un SAARI mismatched deliveries ko dhoondh ke unke Order ka
 * status "returned_to_factory" kar deta hai — one-time backfill.
 *
 * USAGE:
 *   Dry-run (kuch bhi change nahi karega, sirf list dikhayega):
 *     node scripts/fix-order-status-sync.js
 *
 *   Apply (actual DB update karega):
 *     node scripts/fix-order-status-sync.js --apply
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Delivery = require('./models/Delivery');
const Order = require('./models/Order');

const APPLY = process.argv.includes('--apply');

// Statuses jinhe hum "already terminal / not synced" maan ke Order ko
// bhi wahi terminal state mein le jaate hain
const TERMINAL_SYNC_MAP = {
  'Returned_to_Factory': 'Returned_to_Factory'
};

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI / MONGO_URI env variable nahi mila. .env check karo.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log(`✅ MongoDB connected | Mode: ${APPLY ? 'APPLY (changes honge)' : 'DRY-RUN (kuch change nahi hoga)'}\n`);

  const deliveryStatuses = Object.keys(TERMINAL_SYNC_MAP);

  const mismatched = await Delivery.find({ status: { $in: deliveryStatuses } })
    .select('trackingNumber orderId status')
    .lean();

  console.log(`🔍 Total "Returned_to_Factory" deliveries mile: ${mismatched.length}\n`);

  let fixedCount = 0;
  let alreadyOkCount = 0;
  let notFoundCount = 0;

  for (const d of mismatched) {
    if (!d.orderId) {
      console.warn(`⚠️  ${d.trackingNumber} — orderId hi missing hai, skip kar rahe hain`);
      continue;
    }

    const expectedOrderStatus = TERMINAL_SYNC_MAP[d.status];

    const order = await Order.findOne({ orderNumber: d.orderId }).select('orderNumber status');

    if (!order) {
      console.warn(`⚠️  ${d.trackingNumber} — linked Order "${d.orderId}" nahi mila DB mein`);
      notFoundCount++;
      continue;
    }

    if (order.status === expectedOrderStatus) {
      alreadyOkCount++;
      continue;
    }

    console.log(
      `${APPLY ? '🔧 FIXING' : '📝 WOULD FIX'} → Order "${order.orderNumber}": ` +
      `"${order.status}" → "${expectedOrderStatus}"  (delivery: ${d.trackingNumber})`
    );

    if (APPLY) {
      order.status = expectedOrderStatus;
      await order.save();
    }

    fixedCount++;
  }

  console.log('\n========== SUMMARY ==========');
  console.log(`Total Returned_to_Factory deliveries checked : ${mismatched.length}`);
  console.log(`Already in sync                              : ${alreadyOkCount}`);
  console.log(`Linked Order not found                       : ${notFoundCount}`);
  console.log(`${APPLY ? 'Fixed' : 'Would fix'}                                        : ${fixedCount}`);
  console.log('==============================\n');

  if (!APPLY && fixedCount > 0) {
    console.log('👉 Ye sirf DRY-RUN tha. Actual DB update karne ke liye:');
    console.log('   node scripts/fix-order-status-sync.js --apply\n');
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Script error:', err);
  process.exit(1);
});