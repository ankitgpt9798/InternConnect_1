import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';

// Razorpay Test Mode: the key id starts with "rzp_test_" (server.js refuses any other key) and no real money moves.
// The key secret stays on the server; the browser only ever receives the key id.
const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

// Resolves to Razorpay's order: { id: "order_…", amount, currency, status, … }
export const createOrder = ({ amountPaise, receipt, notes }) =>
  razorpay.orders.create({ amount: amountPaise, currency: 'INR', receipt, notes });

// Resolves to Razorpay's own record of a payment: { id: "pay_…", order_id, amount, currency, status, … }
export const fetchPayment = (paymentId) => razorpay.payments.fetch(paymentId);

// Captures an "authorized" payment (needed when automatic capture is off in the Razorpay dashboard).
export const capturePayment = (paymentId, amountPaise) => razorpay.payments.capture(paymentId, amountPaise, 'INR');

// After a successful payment, Checkout returns razorpay_signature = HMAC-SHA256("<order_id>|<payment_id>") keyed
// with the key secret. Only Razorpay and this server know the secret, so a browser cannot make up a valid one.
export function isValidSignature(orderId, paymentId, signature) {
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  // timingSafeEqual: the response time does not reveal how much of a guessed signature was right.
  return a.length === b.length && timingSafeEqual(a, b);
}
