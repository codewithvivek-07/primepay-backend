/**
 * In-memory store - used as a fallback when MongoDB is not configured.
 * This allows the app to run and be tested without a database.
 * For production, configure MONGODB_URI and use the Mongoose model instead.
 */

const store = new Map();

const memoryStore = {
  async create(data) {
    const txn = {
      ...data,
      createdAt: data.createdAt || new Date(),
      completedAt: data.completedAt || null
    };
    store.set(data.orderId, txn);
    return txn;
  },

  async findOne(orderId) {
    return store.get(orderId) || null;
  },

  async findByUtr(utr) {
    for (const txn of store.values()) {
      if (txn.utr === utr) return txn;
    }
    return null;
  },

  async update(orderId, updates) {
    const txn = store.get(orderId);
    if (!txn) return null;
    const updated = { ...txn, ...updates };
    store.set(orderId, updated);
    return updated;
  },

  async findAll(filter = {}) {
    let results = Array.from(store.values());

    if (filter.status) {
      results = results.filter(t => t.status === filter.status);
    }
    if (filter.orderId) {
      results = results.filter(t =>
        t.orderId.toLowerCase().includes(filter.orderId.toLowerCase())
      );
    }
    if (filter.utr) {
      results = results.filter(t =>
        t.utr && t.utr.toLowerCase().includes(filter.utr.toLowerCase())
      );
    }

    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async stats() {
    const all = Array.from(store.values());
    return {
      total: all.length,
      success: all.filter(t => t.status === 'SUCCESS').length,
      pending: all.filter(t => t.status === 'PENDING').length,
      failed: all.filter(t => t.status === 'FAILURE').length
    };
  }
};

module.exports = memoryStore;
