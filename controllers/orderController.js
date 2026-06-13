const QRCode = require('qrcode');
const { db } = require('../models/db');
const tranzupi = require('../utils/tranzupi');
const { generateOrderId } = require('../utils/generateOrderId');

/**
 * POST /api/create-order
 * Creates a new payment order, calls TranzUPI, generates QR, stores transaction
 */
async function createOrder(req, res) {
  try {
    const { amount, customer_mobile, remark1, remark2 } = req.body;

    // Validate amount
    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid amount greater than 0.'
      });
    }

    if (numericAmount > 200000) {
      return res.status(400).json({
        success: false,
        message: 'Amount exceeds maximum transaction limit of ₹2,00,000.'
      });
    }

    // Validate mobile (optional but recommended by TranzUPI)
    const mobile = customer_mobile && /^[6-9]\d{9}$/.test(customer_mobile)
      ? customer_mobile
      : '9999999999'; // fallback dummy mobile if not provided

    // Generate unique order ID
    const orderId = generateOrderId();

    const redirectUrl = process.env.REDIRECT_URL || `${process.env.FRONTEND_URL || ''}/success.html`;

    // Call TranzUPI create-order API
    const tranzResponse = await tranzupi.createOrder({
      customer_mobile: mobile,
      amount: numericAmount,
      order_id: orderId,
      redirect_url: `${redirectUrl}?order_id=${orderId}`,
      remark1: remark1 || 'PrimePay Order',
      remark2: remark2 || 'Test Gateway'
    });

    if (!tranzResponse.success) {
      return res.status(502).json({
        success: false,
        message: 'Unable to create payment order. Please try again shortly.',
        error: tranzResponse.error
      });
    }

    const tranzData = tranzResponse.data;

    // TranzUPI typically returns { status: true, result: { payment_url, ... } }
    const paymentUrl = tranzData?.result?.payment_url || tranzData?.payment_url;

    if (!paymentUrl) {
      return res.status(502).json({
        success: false,
        message: 'Payment gateway did not return a valid payment link.',
        error: tranzData
      });
    }

    // Generate QR code from payment URL (as data URL)
    const qrCodeDataUrl = await QRCode.toDataURL(paymentUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f0f23',
        light: '#ffffff'
      }
    });

    // Store transaction as PENDING
    await db.create({
      orderId,
      amount: numericAmount,
      utr: null,
      status: 'PENDING',
      paymentUrl,
      customerMobile: mobile,
      remark1: remark1 || 'PrimePay Order',
      remark2: remark2 || 'Test Gateway',
      txnRemark: null,
      webhookProcessed: false
    });

    return res.json({
      success: true,
      order_id: orderId,
      payment_url: paymentUrl,
      qr_code: qrCodeDataUrl,
      amount: numericAmount
    });

  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while creating your order. Please try again.'
    });
  }
}

/**
 * GET /api/order-status/:orderId
 * Checks current status of an order - first checks DB, then verifies with TranzUPI if pending
 */
async function getOrderStatus(req, res) {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const txn = await db.findOne(orderId);

    if (!txn) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // If already finalized, return cached status (avoid unnecessary API calls)
    if (txn.status !== 'PENDING') {
      return res.json({
        success: true,
        order_id: txn.orderId,
        status: txn.status,
        amount: txn.amount,
        utr: txn.utr,
        completedAt: txn.completedAt
      });
    }

    // Still pending - check with TranzUPI
    const statusResponse = await tranzupi.checkOrderStatus(orderId);

    if (!statusResponse.success) {
      // Don't fail the poll - just return current pending status
      return res.json({
        success: true,
        order_id: txn.orderId,
        status: 'PENDING',
        amount: txn.amount,
        utr: null
      });
    }

    const result = statusResponse.data?.result || statusResponse.data;
    const remoteStatus = (result?.txnStatus || result?.status || '').toUpperCase();

    let mappedStatus = 'PENDING';
    if (remoteStatus === 'SUCCESS' || remoteStatus === 'PAID' || remoteStatus === 'COMPLETED') {
      mappedStatus = 'SUCCESS';
    } else if (remoteStatus === 'FAILURE' || remoteStatus === 'FAILED' || remoteStatus === 'CANCELLED') {
      mappedStatus = 'FAILURE';
    }

    if (mappedStatus !== 'PENDING') {
      const updated = await db.update(orderId, {
        status: mappedStatus,
        utr: result?.utr || result?.UTR || txn.utr,
        txnRemark: result?.txn_remark || result?.remark || null,
        completedAt: new Date()
      });

      return res.json({
        success: true,
        order_id: updated.orderId,
        status: updated.status,
        amount: updated.amount,
        utr: updated.utr,
        completedAt: updated.completedAt
      });
    }

    return res.json({
      success: true,
      order_id: txn.orderId,
      status: 'PENDING',
      amount: txn.amount,
      utr: null
    });

  } catch (err) {
    console.error('Get order status error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to check payment status right now.'
    });
  }
}

module.exports = { createOrder, getOrderStatus };
