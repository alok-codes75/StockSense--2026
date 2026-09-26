import mongoose from 'mongoose';
import { initStore } from '../models/store.js';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      console.log('Attempting to connect to MongoDB Atlas / cluster...');
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000
      });
      console.log('Connected to MongoDB successfully.');
      return { type: 'mongodb', uri };
    } catch (err: any) {
      console.warn(`MongoDB connection failed (${err.message}). Using persistent storage engine.`);
    }
  }

  // Initialize embedded persistent store
  initStore();
  console.log('StockSense active with persistent database storage engine.');
  return { type: 'embedded' };
}
