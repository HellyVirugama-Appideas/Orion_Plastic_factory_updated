// find-duplicate-coordinates.js
//
// USAGE:
//   Isko apne project root mein rakho (jahan .env aur node_modules hain)
//   fir run karo:  node find-duplicate-coordinates.js
//
// KYA KARTA HAI:
//   Saari deliveries ki pickupLocation aur deliveryLocation coordinates
//   ikattha karke dekhta hai ki kahin do alag deliveries ke coordinates
//   EXACTLY same toh nahi hain (jo galat/duplicate address-entry ka
//   signal hai). Jo bhi groups milte hain unhe print kar deta hai taaki
//   aap seedha un specific deliveries ko DB/admin-panel mein jaakar
//   check aur correct kar sako.

require('dotenv').config();
const mongoose = require('mongoose');
const Delivery = require('./models/Delivery'); // path apne project ke hisaab se adjust karo agar zarurat ho

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  const deliveries = await Delivery.find(
    {},
    'trackingNumber status pickupLocation deliveryLocation'
  ).lean();

  // key = "lat,lng" -> list of { trackingNumber, field }
  const coordMap = new Map();

  const addPoint = (delivery, field, loc) => {
    const lat = loc?.coordinates?.latitude;
    const lng = loc?.coordinates?.longitude;
    if (lat === undefined || lng === undefined || lat === null || lng === null) return;

    const key = `${lat},${lng}`;
    if (!coordMap.has(key)) coordMap.set(key, []);
    coordMap.get(key).push({
      trackingNumber: delivery.trackingNumber,
      status: delivery.status,
      field,
      address: loc.address || '(no address saved)'
    });
  };

  deliveries.forEach(d => {
    addPoint(d, 'pickupLocation', d.pickupLocation);
    addPoint(d, 'deliveryLocation', d.deliveryLocation);
  });

  console.log('====== DUPLICATE COORDINATE GROUPS ======\n');
  let foundAny = false;

  for (const [coordKey, entries] of coordMap.entries()) {
    // Sirf wahi groups dikhao jinme 2+ ALAG deliveries same coordinate share kar rahi hain
    const uniqueTrackingNumbers = new Set(entries.map(e => e.trackingNumber));
    if (uniqueTrackingNumbers.size > 1) {
      foundAny = true;
      console.log(`📍 Coordinates: ${coordKey}`);
      entries.forEach(e => {
        console.log(
          `   - ${e.trackingNumber} | ${e.field} | status: ${e.status} | address: ${e.address}`
        );
      });
      console.log('');
    }
  }

  if (!foundAny) {
    console.log('Koi duplicate coordinate group nahi mila — sab clean hai.');
  } else {
    console.log(
      '⚠️  Upar dikhaye gaye groups mein 2+ alag deliveries ka ek hi exact\n' +
      '   coordinate hai. In sab ko admin panel/DB mein check karo — jinke\n' +
      '   address alag hain par coordinates same hain, unko re-geocode ya\n' +
      '   manually correct karna hoga.'
    );
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});