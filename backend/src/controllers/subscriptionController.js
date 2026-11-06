import { PLANS, planResponse } from '../utils/plans.js';
import { getApplicationQuota } from '../utils/quota.js';

// GET /api/subscriptions/plans
export function getPlans(req, res) {
  res.json({ plans: PLANS.map(planResponse) });
}

// GET /api/subscriptions/me - the plan in force and the applications used and left
export async function getMySubscription(req, res) {
  res.json({ subscription: await getApplicationQuota(req.user) });
}
