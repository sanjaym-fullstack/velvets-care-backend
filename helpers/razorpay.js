const RazorpaySdk = require('razorpay');
require('dotenv/config')

const razorpayInstance = new RazorpaySdk({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});

const createRazorpayOrder = async (amount, currency = 'INR', receipt = `receipt_${Date.now()}`) => {
  try {
    const options = {
      amount: amount * 100,
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

const createRazorpayContact = async (name, phone, email, reference_id) => {
  try {
    const contact = await razorpayInstance.contacts.create({
      name,
      contact: phone,
      email,
      type: 'vendor',
      reference_id
    });
    return contact;
  } catch (error) {
    console.log(error);
    throw new Error(`Razorpay contact creation failed: ${error.message}`);
  }
};

const createRazorpayFundAccount = async (contact_id, account_holder_name, account_number, ifsc) => {
  try {
    const fundAccount = await razorpayInstance.fundAccounts.create({
      contact_id,
      account_type: 'bank_account',
      bank_account: {
        name: account_holder_name,
        ifsc,
        account_number
      }
    });
    return fundAccount;
  } catch (error) {
    console.log(error);
    throw new Error(`Razorpay fund account creation failed: ${error.message}`);
  }
};

const createRazorpayPayout = async (account_number, fund_account_id, amount, mode = 'IMPS', purpose = 'payout', narration = 'Doctor Payout') => {
  try {
    const payout = await razorpayInstance.payouts.create({
      account_number,
      fund_account_id,
      amount: Math.round(amount * 100),
      currency: 'INR',
      mode,
      purpose,
      queue_if_low_balance: true,
      narration
    });
    return payout;
  } catch (error) {
    console.log(error);
    throw new Error(`Razorpay payout creation failed: ${error.message}`);
  }
};

const fetchRazorpayPayout = async (payout_id) => {
  try {
    const payout = await razorpayInstance.payouts.fetch(payout_id);
    return payout;
  } catch (error) {
    throw new Error(`Razorpay payout fetch failed: ${error.message}`);
  }
};

const fetchRazorpayBalance = async () => {
  try {
    const balance = await razorpayInstance.payments.balance();
    return balance;
  } catch (error) {
    throw new Error(`Razorpay balance fetch failed: ${error.message}`);
  }
};

module.exports = {
  createRazorpayOrder,
  capturePayment,
  createRazorpayContact,
  createRazorpayFundAccount,
  createRazorpayPayout,
  fetchRazorpayPayout,
  fetchRazorpayBalance
};
