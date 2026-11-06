import api from './axios.js';

// { open, start, end, timeZone, opensAt, testOverride, serverTime }
export const getPaymentWindow = () => api.get('/payments/window').then((res) => res.data.window);

// Returns { checkout } for Razorpay Checkout.
export const createSubscriptionOrder = (plan) => api.post('/payments/subscription/order', { plan }).then((res) => res.data);

// Sends Razorpay's answer ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) to the server to check.
export const verifyPayment = (razorpayResponse) => api.post('/payments/verify', razorpayResponse).then((res) => res.data);

export const getMyPayments = () => api.get('/payments').then((res) => res.data.payments);
