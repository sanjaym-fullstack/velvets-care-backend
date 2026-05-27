const Razorpay = require('razorpay');
require('dotenv/config')

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});

const createRazorpayOrder = async (amount, currency = 'INR', receipt = `receipt_${Date.now()}`) => {
  try {
    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt,
      payment_capture: 1
    };

    const order = await razorpayInstance.orders.create(options);
    return order;
  } catch (error) {
    console.log(error);
    throw new Error(`Razorpay order creation failed: ${error.message}`);
  }
};

const capturePayment = async (amount, razorpayPaymentId) => {
  try {
   const payment = await razorpayInstance.payments.capture(razorpayPaymentId, amount, "INR")
    return payment;
  } catch (error) {
    throw new Error(`Razorpay payment capture failed: ${error.message}`);
  }
};

module.exports = {
  createRazorpayOrder,
  capturePayment
};


