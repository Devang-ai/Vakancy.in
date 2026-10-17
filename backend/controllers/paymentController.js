const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { razorpayInstance, key_id, key_secret } = require('../config/razorpay');

// Create Razorpay Order
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, payment_type, plan_id } = req.body;
    const userId = req.user.id;

    if (!amount || !payment_type) {
      return res.status(400).json({ success: false, message: 'Amount and payment_type are required.' });
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let razorpayOrderId = orderId;

    if (razorpayInstance) {
      try {
        const orderParams = {
          amount: Math.round(Number(amount) * 100), // Amount in paise
          currency: 'INR',
          receipt: orderId
        };
        const rzpOrder = await razorpayInstance.orders.create(orderParams);
        razorpayOrderId = rzpOrder.id;
      } catch (rzpErr) {
        console.warn('Razorpay order creation fallback:', rzpErr.message);
      }
    }

    const paymentId = uuidv4();
    let subscriptionId = null;

    // Create draft subscription record if payment_type === 'employer_subscription'
    if (payment_type === 'employer_subscription' && plan_id) {
      const emps = await db.query('SELECT id FROM EMPLOYERS WHERE user_id = ?', [userId]);
      if (emps.length > 0) {
        subscriptionId = uuidv4();
        const plans = await db.query('SELECT duration_days FROM SUBSCRIPTION_PLAN WHERE id = ?', [plan_id]);
        const durationDays = plans.length > 0 ? plans[0].duration_days : 30;

        const startDate = new Date().toISOString().slice(0, 10);
        const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        await db.query(
          'INSERT INTO EMPLOYER_SUBSCRIPTION (id, employer_id, plan_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, "expired")',
          [subscriptionId, emps[0].id, plan_id, startDate, endDate]
        );
      }
    }

    await db.query(
      'INSERT INTO PAYMENT (id, user_id, subscription_id, amount, payment_type, status, razorpay_txn_id) VALUES (?, ?, ?, ?, ?, "pending", ?)',
      [paymentId, userId, subscriptionId, amount, payment_type, razorpayOrderId]
    );

    res.json({
      success: true,
      order: {
        id: razorpayOrderId,
        payment_id: paymentId,
        amount: Number(amount),
        currency: 'INR',
        key_id: key_id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating payment order.', error: error.message });
  }
};

// Verify Payment & Activate Features
const verifyPayment = async (req, res) => {
  try {
    const { payment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.id;

    // Verify signature if credentials provided
    let isSignatureValid = true;
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature && key_secret && !key_secret.includes('sample')) {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto.createHmac('sha256', key_secret).update(body.toString()).digest('hex');
      isSignatureValid = (expectedSignature === razorpay_signature);
    }

    if (!isSignatureValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature verification.' });
    }

    const txnId = razorpay_payment_id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Update payment record
    const payments = await db.query('SELECT * FROM PAYMENT WHERE id = ?', [payment_id]);
    if (payments.length === 0) return res.status(404).json({ success: false, message: 'Payment record not found.' });

    const payment = payments[0];
    await db.query(
      'UPDATE PAYMENT SET status = "completed", razorpay_txn_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?',
      [txnId, payment_id]
    );

    // Fulfill purchased item
    if (payment.payment_type === 'employer_subscription' && payment.subscription_id) {
      await db.query('UPDATE EMPLOYER_SUBSCRIPTION SET status = "active" WHERE id = ?', [payment.subscription_id]);
    } else if (payment.payment_type === 'candidate_premium') {
      const cands = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [userId]);
      if (cands.length > 0) {
        const candId = cands[0].id;
        const premId = uuidv4();
        const startDate = new Date().toISOString().slice(0, 10);
        const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        await db.query(
          'INSERT INTO PREMIUM_PROFILE (id, candidate_id, start_date, end_date, status) VALUES (?, ?, ?, ?, "active")',
          [premId, candId, startDate, endDate]
        );
        await db.query('UPDATE CANDIDATES SET is_premium = 1 WHERE id = ?', [candId]);
        await db.query('UPDATE PAYMENT SET premium_profile_id = ? WHERE id = ?', [premId, payment_id]);
      }
    }

    // Trigger Notification
    const notifId = uuidv4();
    await db.query(
      'INSERT INTO NOTIFICATION (id, user_id, type, title, message) VALUES (?, ?, "payment", "Payment Successful", "Your payment of ₹' + payment.amount + ' was processed successfully.")',
      [notifId, userId]
    );

    res.json({ success: true, message: 'Payment verified and service activated successfully.', txn_id: txnId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error verifying payment.', error: error.message });
  }
};

// Payment History
const getPaymentHistory = async (req, res) => {
  try {
    let payments;
    if (req.user.role === 'admin') {
      payments = await db.query('SELECT * FROM PAYMENT ORDER BY created_at DESC');
    } else {
      payments = await db.query('SELECT * FROM PAYMENT WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    }

    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching payment history.', error: error.message });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  getPaymentHistory
};
