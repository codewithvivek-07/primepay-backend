const mongoose = require('mongoose');
const Transaction = require('./Transaction');
const memoryStore = require('./memoryStore');

let usingMongo = false;

/**
 * Initialize database connection.
 * Falls back to in-memory store if MONGODB_URI is not set or connection fails.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri === 'YOUR_DATABASE_URL') {
    console.warn('⚠️  MONGODB_URI not configured. Using in-memory store (data will not persist).');
    usingMongo = false;
    return;
  }

  try {
    await mongoose.connect(uri);
    usingMongo = true;
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.warn('⚠️  Falling back to in-memory store (data will not persist).');
    usingMongo = false;
  }
}

/**
 * Unified data access layer - abstracts MongoDB vs in-memory store
 */
const db = {
  async create(data) {
    if (usingMongo) {
      const txn = new Transaction(data);
      await txn.save();
      return txn.toObject();
    }
    return memoryStore.create(data);
  },

  async findOne(orderId) {
    if (usingMongo) {
      const txn = await Transaction.findOne({ orderId });
      return txn ? txn.toObject() : null;
    }
    return memoryStore.findOne(orderId);
  },

  async findByUtr(utr) {
    if (usingMongo) {
      const txn = await Transaction.findOne({ utr });
      return txn ? txn.toObject() : null;
    }
    return memoryStore.findByUtr(utr);
  },

  async update(orderId, updates) {
    if (usingMongo) {
      const txn = await Transaction.findOneAndUpdate(
        { orderId },
        { $set: updates },
        { new: true }
      );
      return txn ? txn.toObject() : null;
    }
    return memoryStore.update(orderId, updates);
  },

  async findAll(filter = {}) {
    if (usingMongo) {
      const query = {};
      if (filter.status) query.status = filter.status;
      if (filter.orderId) query.orderId = { $regex: filter.orderId, $options: 'i' };
      if (filter.utr) query.utr = { $regex: filter.utr, $options: 'i' };

      const txns = await Transaction.find(query).sort({ createdAt: -1 });
      return txns.map(t => t.toObject());
    }
    return memoryStore.findAll(filter);
  },

  async stats() {
    if (usingMongo) {
      const [total, success, pending, failed] = await Promise.all([
        Transaction.countDocuments(),
        Transaction.countDocuments({ status: 'SUCCESS' }),
        Transaction.countDocuments({ status: 'PENDING' }),
        Transaction.countDocuments({ status: 'FAILURE' })
      ]);
      return { total, success, pending, failed };
    }
    return memoryStore.stats();
  },

  isUsingMongo() {
    return usingMongo;
  }
};

module.exports = { connectDB, db };
