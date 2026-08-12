// STEP 1: Inspect Region documents matching the problem zipcodes,
// and scan the WHOLE regions collection for corrupted fields.
// STEP 2: Auto-fix by removing corrupted array entries.
//
// Usage: node fix-corrupted-regions.js
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB\n');

  const collection = mongoose.connection.collection('regions');

  const docs = await collection.find({}).toArray();
  console.log(`Total documents in "regions" collection: ${docs.length}\n`);

  let fixed = 0;

  for (const doc of docs) {
    console.log(`--- Region: ${doc.regionName || doc._id} ---`);
    console.log(JSON.stringify(doc, null, 2));

    let changed = false;
    const update = {};

    // Check every array field on the document for primitive (non-object) items
    // that shouldn't be there — e.g. zipcodes: [{...}, "9123"] instead of
    // zipcodes: [{...}, {...}]. We only touch fields that are arrays.
    for (const key of Object.keys(doc)) {
      const val = doc[key];
      if (Array.isArray(val)) {
        const hasObjectItems = val.some(v => v && typeof v === 'object' && !Array.isArray(v));
        const hasPrimitiveItems = val.some(v => typeof v === 'string' || typeof v === 'number');

        // Mixed array (some objects, some raw strings/numbers) = corruption signature
        if (hasObjectItems && hasPrimitiveItems) {
          const cleanArr = val.filter(v => v && typeof v === 'object' && !Array.isArray(v));
          console.log(`  🚨 Field "${key}" is a MIXED array (objects + primitives). Cleaning: ${val.length} -> ${cleanArr.length} items`);
          update[key] = cleanArr;
          changed = true;
        }
      }
    }

    if (changed) {
      await collection.updateOne({ _id: doc._id }, { $set: update });
      fixed++;
      console.log(`  ✅ Fixed.`);
    }
    console.log('');
  }

  console.log(`Done. Checked ${docs.length} regions, fixed ${fixed}.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Fix failed:', err);
  process.exit(1);
});