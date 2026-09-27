import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let isMongoConnected = false;

async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rate_limiter', {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    isMongoConnected = true;
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.warn('⚠️  MongoDB unavailable, request logging disabled:', err.message);
    isMongoConnected = false;
  }

  mongoose.connection.on('error', (err) => {
    console.warn('⚠️  MongoDB connection error:', err.message);
    isMongoConnected = false;
  });

  mongoose.connection.on('connected', () => {
    isMongoConnected = true;
  });
}

function isMongoReady() {
  return isMongoConnected && mongoose.connection.readyState === 1;
}

export { connectMongoDB, isMongoReady };
