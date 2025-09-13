import mongoose from 'mongoose';

// Mock MongoDB connection for tests
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-detection-test';
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.disconnect();
});

// Clean up after each test
afterEach(async () => {
  if (mongoose.connection.db) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});
