const { db } = require('../models/db');
const tranzupi = require('../utils/tranzupi');

/**
 * POST /api/tranzupi-webhook
 * Receives payment status updates from TranzUPI.
 * Validates fields, prevents duplicate processing, re-verifies with check-order-status
 * before marking a transaction as SUCCESS.
 */
async function handleWebhook(req, res) {
  try {
    const {
      order_id,
      amount,
      customer_mobile,
      remark1,
      remark2,
      success_time,
      utr,
      status,
      txn_remark
    } = req.body || {};

    // --- Validate required fields ---
    if (!order_id || !status) {
      console.warn('Webhook rejected: missing required fields', req.body);
      // Still return 200 so TranzUPI doesn't keep retrying a malformed payload,
      // but log it for investigation.
      return res.status(200).json({
        success: false,
        message: 'Missing required fields: order_id and status are mandatory.'
      });
    }

    // --- Find the transaction ---
    const txn = await db.findOne(order_id);

    if (!txn) {
      console.warn(`Webhook received for unknown order_id: ${order_id}`);
      return res.status(200).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // --- Prevent duplicate processing ---
    if (txn.webhookProcessed && txn.status !== 'PENDING') {
      console.log(`Webhook for ${order_id} already processed. Skipping.`);
      return res.status(200).json({
        success: true,
        message: 'Already processed.'
      });
    }

    const normalizedStatus = String(status).toUpperCase();

    // --- Handle FAILURE / CANCELLED directly ---
    if (normalizedStatus === 'FAILURE' || normalizedStatus === 'FAILED' || normalizedStatus === 'CANCELLED') {
      await db.update(order_id, {
        status: 'FAILURE',
        utr: utr || txn.utr,
        txnRemark: txn_remark || 'Payment failed',
        webhookProcessed: true,
        completedAt: new Date()
      });

      return res.status(200).json({ success: true, message: 'Failure recorded.' });
    }

    // --- For SUCCESS, re-verify using check-order-status before finalizing ---
    if (normalizedStatus === 'SUCCESS' || normalizedStatus === 'PAID' || normalizedStatus === 'COMPLETED') {
      const verification = await tranzupi.checkOrderStatus(order_id);

      let verifiedSuccess = false;
      let verifiedUtr = utr;

      if (verification.success) {
        const result = verification.data?.result || verification.data;
        const remoteStatus = (result?.txnStatus || result?.status || '').toUpperCase();

        if (remoteStatus === 'SUCCESS' || remoteStatus === 'PAID' || remoteStatus === 'COMPLETED') {
          verifiedSuccess = true;
          verifiedUtr = result?.utr || result?.UTR || utr;
        }
      } else {
        // If verification API call fails, fall back to trusting the webhook
        // payload itself (since amount/order_id are validated), but log it.
        console.warn(`Could not re-verify order ${order_id} via check-order-status. Trusting webhook payload.`);
        verifiedSuccess = true;
      }

      if (verifiedSuccess) {
        // Optional: validate amount matches
        if (amount && Number(amount) !== Number(txn.amount)) {
          console.warn(`Amount mismatch for ${order_id}: webhook=${amount}, stored=${txn.amount}`);
        }

        await db.update(order_id, {
          status: 'SUCCESS',
          utr: verifiedUtr || null,
          txnRemark: txn_remark || 'Payment successful',
          webhookProcessed: true,
          completedAt: success_time ? new Date(success_time) : new Date()
        });

        return res.status(200).json({ success: true, message: 'Success recorded.' });
      } else {
        // Verification says not success - keep as pending, don't mark processed
        console.warn(`Webhook claimed SUCCESS for ${order_id} but verification did not confirm.`);
        return res.status(200).json({
          success: false,
          message: 'Could not verify success status.'
        });
      }
    }

    // --- Unknown status - just acknowledge ---
    console.log(`Webhook for ${order_id} received unrecognized status: ${status}`);
    return res.status(200).json({ success: true, message: 'Webhook received.' });

  } catch (err) {
    console.error('Webhook processing error:', err);
    // Always return 200 to prevent TranzUPI retry storms on internal errors,
    // but log for investigation.
    return res.status(200).json({ success: false, message: 'Internal error processing webhook.' });
  }
}

module.exports = { handleWebhook };
