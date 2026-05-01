require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('./models/Driver');

async function debug() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const drivers = await Driver.find({}).limit(3).lean();
  
  drivers.forEach(d => {
    console.log('Driver:', d.name);
    console.log('governmentIds:', JSON.stringify(d.governmentIds));
    console.log('---');
  });
  
  process.exit(0);
}

debug().catch(console.error);