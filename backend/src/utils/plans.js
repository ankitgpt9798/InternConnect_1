// The subscription plans from the assignment. Prices are in paise (₹1 = 100 paise), the unit Razorpay uses,
// so amounts are whole numbers. applicationsPerMonth: null means unlimited.
export const PLANS = [
  { id: 'free', name: 'Free', pricePaise: 0, applicationsPerMonth: 1 },
  { id: 'bronze', name: 'Bronze', pricePaise: 100_00, applicationsPerMonth: 3 },
  { id: 'silver', name: 'Silver', pricePaise: 300_00, applicationsPerMonth: 5 },
  { id: 'gold', name: 'Gold', pricePaise: 1000_00, applicationsPerMonth: null },
];

export const PLAN_IDS = PLANS.map((plan) => plan.id);
export const FREE_PLAN = PLANS[0];
export const PLAN_DAYS = 30; // a paid plan lasts 30 days from the payment

export const planById = (id) => PLANS.find((plan) => plan.id === id);

// A plan as the API shows it, with the price in rupees.
export const planResponse = (plan) => ({
  id: plan.id,
  name: plan.name,
  price: plan.pricePaise / 100,
  applicationsPerMonth: plan.applicationsPerMonth,
});
