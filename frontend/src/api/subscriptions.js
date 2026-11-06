import api from './axios.js';

// [{ id, name, price (rupees), applicationsPerMonth (null = unlimited) }]
export const getPlans = () => api.get('/subscriptions/plans').then((res) => res.data.plans);

// { plan, startedAt, expiresAt, used, limit, remaining, resetsAt }
export const getMySubscription = () => api.get('/subscriptions/me').then((res) => res.data.subscription);
