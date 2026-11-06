import mongoose from 'mongoose';

// What a payment is for: a subscription plan (Module 3) or a premium resume (Module 4).
export const PAYMENT_PURPOSES = ['subscription', 'resume'];

// One Razorpay Test Mode payment. It is created with the order ("created") and becomes "paid" only after the
// backend has verified it with Razorpay.
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: PAYMENT_PURPOSES, required: true },
    plan: { type: String, default: null }, // for subscription payments
    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null },
    status: { type: String, enum: ['created', 'paid'], default: 'created' },
    invoiceNumber: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ user: 1, paidAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
