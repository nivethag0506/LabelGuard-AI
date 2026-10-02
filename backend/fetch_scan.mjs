import mongoose from 'mongoose';

mongoose.connect('mongodb://127.0.0.1:27017/legalscan').then(async () => {
  const db = mongoose.connection.db;
  const scans = await db.collection('scans').find({ 'views.file': /635539967/ }).toArray();
  console.log(JSON.stringify(scans, null, 2));
  mongoose.disconnect();
}).catch(console.error);
