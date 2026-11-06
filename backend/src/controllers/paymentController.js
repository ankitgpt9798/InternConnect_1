import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { completePayment } from '../utils/completePayment.js';
import { formatIst } from '../utils/istTime.js';
import { paymentWindowStatus } from '../utils/paymentWindow.js';
import { planById } from '../utils/plans.js';
import { getApplicationQuota } from '../utils/quota.js';
import { capturePayment, createOrder, fetchPayment, isValidSignature } from '../utils/razorpay.js';
import { toText } from '../utils/validators.js';

const WINDOW_MESSAGE = 'Plan payments are allowed only between 5:00 AM and 11:45 AM IST.';

// GET /api/payments/window - whether plan payments can be started now
export function getPaymentWindow(req, res) {
  res.json({ window: paymentWindowStatus() });
}

// POST /api/payments/subscription/order  { plan: 'bronze' | 'silver' | 'gold' }
// Creates a Razorpay order for the plan. The price always comes from the server's plan list.
export async function createSubscriptionOrder(req, res) {
  const plan = planById(toText(req.body?.plan));
  if (!plan || plan.pricePaise === 0) {
    return res.status(400).json({ message: 'Choose a paid plan: Bronze, Silver or Gold.' });
  }

  const window = paymentWindowStatus();
  if (!window.open) return res.status(403).json({ message: WINDOW_MESSAGE, window });

  let order;
  try {
    order = await createOrder({
      amountPaise: plan.pricePaise,
      receipt: `sub_${Date.now()}`,
      notes: { userId: String(req.user._id), plan: plan.id },
    });
  } catch (error) {
    console.error('Razorpay order failed:', error?.error?.description ?? error.message);
    return res.status(502).json({ message: 'The payment could not be started. Please try again.' });
  }

  await Payment.create({
    user: req.user._id,
    purpose: 'subscription',
    plan: plan.id,
    amountPaise: plan.pricePaise,
    razorpayOrderId: order.id,
  });

  // Everything Razorpay Checkout needs in the browser (never the key secret).
  res.status(201).json({
    checkout: {
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: 'InternConnect',
      description: `${plan.name} plan, 30 days`,
      prefill: { name: req.user.name, email: req.user.email, contact: req.user.phone },
    },
  });
}

// POST /api/payments/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// The browser's word is never enough: the signature is checked and the payment is fetched from Razorpay.
export async function verifyPayment(req, res) {
  const orderId = toText(req.body?.razorpay_order_id);
  const paymentId = toText(req.body?.razorpay_payment_id);
  const signature = toText(req.body?.razorpay_signature);
  if (!orderId || !paymentId || !signature) return res.status(400).json({ message: 'The payment details are missing.' });

  // Only the student who started the payment can complete it.
  const payment = await Payment.findOne({ razorpayOrderId: orderId, user: req.user._id });
  if (!payment) return res.status(404).json({ message: 'Payment not found.' });
  if (payment.status === 'paid') return res.status(409).json({ message: 'This payment has already been completed.' });

  // 1. The signature proves the answer came from Razorpay for this order and payment.
  if (!isValidSignature(orderId, paymentId, signature)) {
    return res.status(400).json({ message: 'The payment could not be verified (invalid signature).' });
  }

  // 2. Razorpay's own record must match the order and the amount, and the money must be captured.
  let razorpayPayment;
  try {
    razorpayPayment = await fetchPayment(paymentId);
    if (razorpayPayment.status === 'authorized') razorpayPayment = await capturePayment(paymentId, payment.amountPaise);
  } catch (error) {
    console.error('Razorpay payment check failed:', error?.error?.description ?? error.message);
    return res.status(400).json({ message: 'The payment could not be verified with Razorpay.' });
  }
  const matches =
    razorpayPayment.order_id === orderId && razorpayPayment.amount === payment.amountPaise && razorpayPayment.currency === 'INR';
  if (!matches) return res.status(400).json({ message: 'The payment does not match this order.' });
  if (razorpayPayment.status !== 'captured') return res.status(400).json({ message: 'The payment was not completed.' });

  // 3. Mark it paid (once) and give the student what they paid for.
  const paid = await completePayment(payment, paymentId);
  if (!paid) return res.status(409).json({ message: 'This payment has already been completed.' });

  if (paid.purpose === 'resume') {
    return res.json({
      message: 'Payment successful. Your resume PDF is ready and attached to your profile. The invoice has been emailed to you.',
      invoiceNumber: paid.invoiceNumber,
      generatedResumeId: paid.generatedResume,
    });
  }

  const user = await User.findById(req.user._id);
  const subscription = await getApplicationQuota(user);
  res.json({
    message: `Payment successful. Your ${subscription.plan.name} plan is active until ${formatIst(subscription.expiresAt)} IST. The invoice has been emailed to you.`,
    invoiceNumber: paid.invoiceNumber,
    subscription,
  });
}

// GET /api/payments - the student's completed payments (plans and resume PDFs), newest first
export async function getMyPayments(req, res) {
  const payments = await Payment.find({ user: req.user._id, status: 'paid' }).sort({ paidAt: -1 });
  res.json({
    payments: payments.map((payment) => ({
      id: payment._id,
      purpose: payment.purpose,
      plan: payment.plan ? planById(payment.plan)?.name : null,
      amount: payment.amountPaise / 100,
      invoiceNumber: payment.invoiceNumber,
      razorpayPaymentId: payment.razorpayPaymentId,
      paidAt: payment.paidAt,
    })),
  });
}
