import Application from '../models/Application.js';
import { startOfIstMonth } from './istTime.js';
import { FREE_PLAN, planById, planResponse } from './plans.js';

// The plan in force now: a paid plan until it expires, otherwise Free.
export function activePlan(user, now = new Date()) {
  const { plan, startedAt, expiresAt } = user.subscription ?? {};
  if (plan && plan !== FREE_PLAN.id && expiresAt > now) return { plan: planById(plan), startedAt, expiresAt };
  return { plan: FREE_PLAN, startedAt: null, expiresAt: null };
}

// How many applications the student has used and has left.
// Free counts per calendar month (IST); a paid plan counts within its 30-day period.
export async function getApplicationQuota(user, now = new Date()) {
  const { plan, startedAt, expiresAt } = activePlan(user, now);
  const isFree = plan.id === FREE_PLAN.id;
  const periodStart = isFree ? startOfIstMonth(now) : startedAt;
  const resetsAt = isFree ? startOfIstMonth(now, 1) : expiresAt;

  const used = await Application.countDocuments({ user: user._id, createdAt: { $gte: periodStart } });
  const limit = plan.applicationsPerMonth; // null = unlimited

  return {
    plan: planResponse(plan),
    startedAt,
    expiresAt, // null for Free
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    resetsAt,
  };
}
