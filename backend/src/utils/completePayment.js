import GeneratedResume from '../models/GeneratedResume.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { formatIst, istDateKey } from './istTime.js';
import { PLAN_DAYS, planById } from './plans.js';
import { sendEmail } from './sendEmail.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// "IC-20261107-AB12CD": the payment day (IST) and the end of Razorpay's payment id.
export const invoiceNumberFor = (date, razorpayPaymentId) => `IC-${istDateKey(date)}-${razorpayPaymentId.slice(-6).toUpperCase()}`;

function subscriptionInvoice({ user, plan, payment, expiresAt }) {
  const applications = plan.applicationsPerMonth === null ? 'Unlimited' : `${plan.applicationsPerMonth} per plan period`;
  return [
    `InternConnect invoice ${payment.invoiceNumber}`,
    '',
    `Billed to: ${user.name} (${user.email})`,
    `Plan: ${plan.name}, ${PLAN_DAYS} days`,
    `Internship applications: ${applications}`,
    `Amount paid: ₹${(payment.amountPaise / 100).toFixed(2)} (INR)`,
    `Paid on: ${formatIst(payment.paidAt)} IST`,
    `Valid until: ${formatIst(expiresAt)} IST`,
    `Razorpay payment ID: ${payment.razorpayPaymentId}`,
    `Razorpay order ID: ${payment.razorpayOrderId}`,
    '',
    'This was a Razorpay Test Mode payment: no real money was charged.',
  ].join('\n');
}

function resumeInvoice({ user, payment }) {
  return [
    `InternConnect invoice ${payment.invoiceNumber}`,
    '',
    `Billed to: ${user.name} (${user.email})`,
    'Item: Premium resume PDF',
    `Amount paid: ₹${(payment.amountPaise / 100).toFixed(2)} (INR)`,
    `Paid on: ${formatIst(payment.paidAt)} IST`,
    `Razorpay payment ID: ${payment.razorpayPaymentId}`,
    `Razorpay order ID: ${payment.razorpayOrderId}`,
    '',
    'Your resume PDF is attached to your profile: download it from the Dashboard or the Resume Builder page.',
    'This was a Razorpay Test Mode payment: no real money was charged.',
  ].join('\n');
}

async function emailInvoice(userId, subject, makeText) {
  const user = await User.findById(userId);
  try {
    await sendEmail({ to: user.email, subject, text: makeText(user) });
  } catch (error) {
    // What was paid for is already given, so a failed email is only logged.
    console.error('The invoice email could not be sent:', error.message);
  }
}

// Called once a payment has been verified with Razorpay. Marks it paid, only once even if two requests arrive
// together, and gives the student what they paid for. Returns the paid payment, or null if it was already done.
export async function completePayment(payment, razorpayPaymentId, now = new Date()) {
  const paid = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'created' },
    { $set: { status: 'paid', razorpayPaymentId, invoiceNumber: invoiceNumberFor(now, razorpayPaymentId), paidAt: now } },
    { returnDocument: 'after' },
  );
  if (!paid) return null;

  if (paid.purpose === 'subscription') {
    // The new plan starts now for 30 days and replaces the current one.
    const plan = planById(paid.plan);
    const expiresAt = new Date(now.getTime() + PLAN_DAYS * DAY_MS);
    await User.updateOne({ _id: paid.user }, { $set: { subscription: { plan: plan.id, startedAt: now, expiresAt } } });
    await emailInvoice(paid.user, `Your InternConnect invoice ${paid.invoiceNumber} (${plan.name} plan)`, (user) =>
      subscriptionInvoice({ user, plan, payment: paid, expiresAt }),
    );
  }

  if (paid.purpose === 'resume') {
    // The PDF is made from the copy of the resume taken when the email code was verified,
    // and becomes the resume attached to the student's profile.
    const generated = await GeneratedResume.create({ user: paid.user, payment: paid._id, content: paid.resumeContent });
    await Payment.updateOne({ _id: paid._id }, { $set: { generatedResume: generated._id } });
    await User.updateOne({ _id: paid.user }, { $set: { resume: generated._id } });
    paid.generatedResume = generated._id;
    await emailInvoice(paid.user, `Your InternConnect invoice ${paid.invoiceNumber} (premium resume PDF)`, (user) =>
      resumeInvoice({ user, payment: paid }),
    );
  }
  return paid;
}
