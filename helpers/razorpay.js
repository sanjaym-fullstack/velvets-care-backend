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
    throw new Error(`Razorpay order creation failed: ${error.error?.description || error.message || 'Unknown error'}`);
  }
};

const capturePayment = async (amount, razorpayPaymentId) => {
  try {
   const payment = await razorpayInstance.payments.capture(razorpayPaymentId, amount, "INR")
    return payment;
  } catch (error) {
    throw new Error(`Razorpay payment capture failed: ${error.error?.description || error.message || 'Unknown error'}`);
  }
};

const fetchPayment = async (razorpayPaymentId) => {
  try {
    const payment = await razorpayInstance.payments.fetch(razorpayPaymentId);
    return payment;
  } catch (error) {
    throw new Error(`Razorpay payment fetch failed: ${error.error?.description || error.message || 'Unknown error'}`);
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
    throw new Error(`Razorpay contact creation failed: ${error.error?.description || error.message || 'Unknown error'}`);
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
    throw new Error(`Razorpay fund account creation failed: ${error.error?.description || error.message || 'Unknown error'}`);
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
    throw new Error(`Razorpay payout creation failed: ${error.error?.description || error.message || 'Unknown error'}`);
  }
};

const fetchRazorpayPayout = async (payout_id) => {
  try {
    const payout = await razorpayInstance.payouts.fetch(payout_id);
    return payout;
  } catch (error) {
    throw new Error(`Razorpay payout fetch failed: ${error.error?.description || error.message || 'Unknown error'}`);
  }
};

const fetchRazorpayBalance = async () => {
  try {
    const balance = await razorpayInstance.payments.balance();
    return balance;
  } catch (error) {
    throw new Error(`Razorpay balance fetch failed: ${error.error?.description || error.message || 'Unknown error'}`);
  }
};

const refundPayment = async (paymentId, amountInRupees, notes = {}) => {
  try {
    // SAFETY: Fetch actual payment from Razorpay to get the real captured amount
    const payment = await razorpayInstance.payments.fetch(paymentId);
    const actualAmountPaidPaise = payment.amount; // Razorpay stores in paise
    const actualAmountPaidRupees = Math.round(actualAmountPaidPaise / 100);

    // Use the minimum of (requested refund, actual paid amount) — never refund more than paid
    const refundInRupees = Math.min(amountInRupees, actualAmountPaidRupees);
    const refundInPaise = Math.round(refundInRupees * 100);

    console.log(`Refund debug: requested=${amountInRupees}rupees, actual_paid=${actualAmountPaidRupees}rupees, refunding=${refundInRupees}rupees (${refundInPaise}paise)`);

    if (refundInPaise <= 0) {
      throw new Error('Nothing to refund — amount is zero');
    }

    const refund = await razorpayInstance.payments.refund(paymentId, {
      amount: refundInPaise,
      notes: {
        reason: notes.reason || 'Appointment cancelled',
        ...notes
      }
    });
    return { ...refund, refund_amount_rupees: refundInRupees };
  } catch (error) {
    throw new Error(`Razorpay refund failed: ${error.error?.description || error.message || 'Unknown error'}`);
  }
};

const fetchRefund = async (refundId) => {
  try {
    const refund = await razorpayInstance.refunds.fetch(refundId);
    return refund;
  } catch (error) {
    throw new Error(`Razorpay refund fetch failed: ${error.error?.description || error.message || 'Unknown error'}`);
  }
};

// Total already refunded against a payment, in paise. Counts only refunds that
// actually settled, so a pending/failed attempt does not eat into the balance.
const getRefundedAmountPaise = async (paymentId) => {
  try {
    const existing = await razorpayInstance.refunds.all({ payment_id: paymentId });
    const items = existing?.items || existing?.data || [];
    return items.reduce((sum, r) => {
      if (r.status === 'failed') return sum;
      return sum + (Number(r.amount) || 0);
    }, 0);
  } catch (error) {
    // A failed lookup must not block the refund; the refund call itself is the
    // real guard, it will reject an over-refund.
    console.error('Could not list existing refunds:', error.message);
    return 0;
  }
};

// Refunds the entire remaining refundable balance on a payment — i.e. 100% of
// what the customer actually paid, minus anything already refunded. Refunds the
// captured amount rather than the catalogue fee, so taxes/discounts are covered
// and the customer is never left with a residue.
const refundFullPayment = async (paymentId, notes = {}) => {
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);

    if (payment.status !== 'captured') {
      throw new Error(`Payment ${paymentId} is ${payment.status}, not captured`);
    }

    const paidPaise = Number(payment.amount) || 0;
    const alreadyRefundedPaise = await getRefundedAmountPaise(paymentId);
    const remainingPaise = paidPaise - alreadyRefundedPaise;

    console.log(
      `Full refund: payment=${paymentId}, paid=${paidPaise}paise, ` +
      `already_refunded=${alreadyRefundedPaise}paise, refunding=${remainingPaise}paise`
    );

    if (remainingPaise <= 0) {
      // Nothing left to give back — treat as already fully refunded.
      return {
        id: null,
        status: 'processed',
        amount: 0,
        refund_amount_rupees: 0,
        already_fully_refunded: true,
      };
    }

    const refund = await razorpayInstance.payments.refund(paymentId, {
      amount: remainingPaise,
      notes: {
        reason: notes.reason || 'Full refund',
        ...notes,
      },
    });

    return {
      ...refund,
      refund_amount_rupees: Math.round(remainingPaise / 100),
      refunded_paise: remainingPaise,
      paid_paise: paidPaise,
    };
  } catch (error) {
    throw new Error(`Razorpay refund failed: ${error.error?.description || error.message || 'Unknown error'}`);
  }
};

// Verifies the X-Razorpay-Signature header against the raw request body.
const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured');
  }
  if (!signature) {
    throw new Error('Missing X-Razorpay-Signature header');
  }
  return razorpayInstance.webhooks.verify(rawBody, signature, secret);
};

module.exports = {
  createRazorpayOrder,
  capturePayment,
  fetchPayment,
  createRazorpayContact,
  createRazorpayFundAccount,
  createRazorpayPayout,
  fetchRazorpayPayout,
  fetchRazorpayBalance,
  refundPayment,
  refundFullPayment,
  fetchRefund,
  verifyWebhookSignature,
};
