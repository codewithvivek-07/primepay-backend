const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  utr: {
    type: String,
    default: null,
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILURE'],
    default: 'PENDING',
    index: true
  },
  paymentUrl: {
    type: String,
    default: null
  },
  customerMobile: {
    type: String,
    default: null
  },
  remark1: {
    type: String,
    default: null
  },
  remark2: {
    type: String,
    default: null
  },
  txnRemark: {
    type: String,
    default: null
  },
  webhookProcessed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
