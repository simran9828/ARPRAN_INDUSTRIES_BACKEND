import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_DB_URL || process.env.MONGODB_URI || 'mongodb+srv://siyarathore2205_db_user:69I5iXRVnPr570Ga@cluster0.d04rl4f.mongodb.net/';

let isConnected = false;

export async function connectMongoDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(MONGO_URI, {
      dbName: 'arpran_cms',
      serverSelectionTimeoutMS: 10000,
      autoIndex: true
    });

    isConnected = true;
    console.log(`✓ MongoDB Connected Successfully to Cluster: ${conn.connection.host} | DB: arpran_cms`);
    return conn.connection;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    // Don't crash process, allows retrying on subsequent requests
    return null;
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️ MongoDB connection lost. Attempting auto-reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('⚠️ MongoDB runtime error:', err.message);
});

export default mongoose;
