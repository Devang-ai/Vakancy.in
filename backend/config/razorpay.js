const Razorpay = require('razorpay');

const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_sample_key_id';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_sample_key_secret';

let razorpayInstance = null;

try {
  razorpayInstance = new Razorpay({
    key_id: key_id,
    key_secret: key_secret
  });
} catch (err) {
  console.warn('⚠️ Razorpay initialization warning:', err.message);
}

module.exports = {
  razorpayInstance,
  key_id,
  key_secret
};
