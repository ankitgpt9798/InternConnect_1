// Razorpay Checkout runs in Razorpay's own window: card, UPI and bank details never touch InternConnect.
// Its script is loaded only when a student actually starts a payment.
const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise = null;

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay Checkout did not load')));
    script.onerror = () => {
      scriptPromise = null; // allow another try
      script.remove();
      reject(new Error('Razorpay Checkout could not be loaded'));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

// Opens Checkout for an order the server created. At the end exactly one of onPaid (Razorpay's answer, which the
// server still verifies) or onClosed (the student closed the window) is called; onFailed may be called before
// that for each declined attempt (the window stays open so the student can try again).
export async function openRazorpayCheckout(checkout, { onPaid, onFailed, onClosed }) {
  const Razorpay = await loadRazorpayScript();
  const instance = new Razorpay({
    key: checkout.keyId,
    order_id: checkout.orderId,
    amount: checkout.amount,
    currency: checkout.currency,
    name: checkout.name,
    description: checkout.description,
    prefill: checkout.prefill,
    theme: { color: '#1d5fd8' },
    handler: onPaid,
    modal: { ondismiss: onClosed },
  });
  instance.on('payment.failed', (event) => onFailed(event.error));
  instance.open();
}
