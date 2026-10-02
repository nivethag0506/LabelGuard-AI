import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/legalscan';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    console.log(`[MongoDB] Active Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    isConnected = false;
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at ${uri}.`);
    console.warn(`[MongoDB Notice] Error: ${error.message}`);
    console.warn(`[MongoDB Notice] LegalScan backend is running with local fallback persistence for demo resilience.`);
    console.warn(`[MongoDB Notice] To connect MongoDB Atlas: set MONGODB_URI in backend/.env`);
    return null;
  }
};

export const isDatabaseConnected = () => {
  return isConnected && mongoose.connection.readyState === 1;
};
