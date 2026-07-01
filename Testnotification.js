// ================================================================
// STANDALONE TEST SCRIPT — poori app se alag, sirf notification test
// ================================================================
// Isko project ke ROOT folder me rakho (jaha se `node server.js` chalate ho)
// Phir terminal me chalao: node test-notification.js
//
// Ye seedha DB se connect karke, ek real driver le kar,
// NotificationService.sendNotification() ko directly call karega.
// Agar ye kaam kar gaya → problem controller/route me hai
// Agar ye bhi fail hua → problem NotificationService/DB/schema me hai
// ================================================================

require('dotenv').config(); // agar .env file use karte ho to
const mongoose = require('mongoose');

async function runTest() {
  try {
    console.log('--- STEP 1: DB connect ---');
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!MONGO_URI) {
      console.error('❌ MONGO_URI env variable nahi mila — apna actual connection string yaha manually daal do neeche');
    }
    await mongoose.connect(MONGO_URI || 'PASTE_YOUR_MONGO_CONNECTION_STRING_HERE');
    console.log('✅ DB connected');

    console.log('--- STEP 2: Ek driver find karo jiska deliveryId order me assigned ho ---');
    const Driver = require('./models/Driver');
    const driver = await Driver.findOne({}).select('_id name fcmToken');

    if (!driver) {
      console.error('❌ Koi driver hi nahi mila DB me. Test rok rahe hain.');
      process.exit(1);
    }

    console.log('✅ Driver mila:', {
      id: driver._id.toString(),
      name: driver.name,
      hasFcmToken: !!driver.fcmToken
    });

    console.log('--- STEP 3: NotificationService require karo ---');
    let NotificationService;
    try {
      NotificationService = require('./utils/sendNotification');
      console.log('✅ NotificationService require ho gaya, type:', typeof NotificationService);
      console.log('✅ sendNotification method type:', typeof NotificationService.sendNotification);
    } catch (reqErr) {
      console.error('❌ NotificationService require karte waqt hi crash ho gaya!');
      console.error(reqErr);
      process.exit(1);
    }

    console.log('--- STEP 4: sendNotification() call karo ---');
    const result = await NotificationService.sendNotification({
      recipientId: driver._id,
      recipientType: 'Driver',
      type: 'delivery_updated',
      title: 'TEST NOTIFICATION',
      message: 'Ye ek manual test notification hai.',
      data: {
        customData: new Map([
          ['testKey', 'testValue']
        ])
      },
      channels: ['push'],
      priority: 'medium',
    });

    console.log('--- RESULT ---');
    console.log('Saved notification:', result ? {
      id: result._id?.toString(),
      recipientId: result.recipientId?.toString(),
      title: result.title,
      createdAt: result.createdAt
    } : 'NULL / UNDEFINED — notification create hi nahi hua!');

    console.log('--- STEP 5: DB me directly check karo ---');
    const Notification = require('./models/Notification');
    const latest = await Notification.find({ recipientId: driver._id })
      .sort({ createdAt: -1 })
      .limit(3);

    console.log(`✅ DB me is driver ke ${latest.length} notifications mile (latest 3):`);
    latest.forEach(n => console.log(` - ${n._id} | ${n.title} | ${n.createdAt}`));

    process.exit(0);

  } catch (err) {
    console.error('❌❌❌ TEST FAILED WITH ERROR:');
    console.error(err);
    process.exit(1);
  }
}

runTest();