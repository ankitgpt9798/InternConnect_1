import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assessSignIn } from '../../src/utils/loginPolicy.js';
import { accountIpCooldownMs, ipCooldownMs } from '../../src/utils/throttle.js';

const known = { ipSeen: true, locationKnown: true, countrySeen: true, browserSeen: true, recentFailures: false };
const assess = (overrides) => assessSignIn({ purpose: 'login', isChrome: false, deviceState: 'trusted', ...known, ...overrides });

describe('sign-in rules (after a correct password)', () => {
  it('R1: Google Chrome always needs a code, even on a trusted device with nothing unusual', () => {
    const decision = assess({ isChrome: true });
    assert.equal(decision.requireOtp, true);
    assert.deepEqual(decision.otpReasons, ['chrome']);
  });

  it('R2: any browser on a new, untrusted or mismatched device needs a code', () => {
    assert.deepEqual(assess({ deviceState: 'new' }).otpReasons, ['new_device']);
    assert.deepEqual(assess({ deviceState: 'untrusted' }).otpReasons, ['untrusted_device']);
    assert.deepEqual(assess({ deviceState: 'mismatch' }).otpReasons, ['device_mismatch']);
    assert.deepEqual(assess({ deviceState: 'new', isChrome: true }).otpReasons, ['chrome', 'new_device']);
  });

  it('R3: a trusted device needs a code after many recent failures from other IP addresses', () => {
    const decision = assess({ recentFailures: true });
    assert.deepEqual(decision.otpReasons, ['recent_failures']);
    assert.equal(decision.risk.level, 'high');
  });

  it('R4: a trusted device on a new IP in a new country needs a code', () => {
    const decision = assess({ ipSeen: false, countrySeen: false });
    assert.deepEqual(decision.otpReasons, ['new_country']);
    assert.equal(decision.risk.level, 'high');
  });

  it('R5: a trusted device on a new IP in a known country is allowed, with an alert email', () => {
    const decision = assess({ ipSeen: false });
    assert.equal(decision.requireOtp, false);
    assert.equal(decision.sendNewIpAlert, true);
    assert.equal(decision.risk.level, 'medium');
    assert.ok(decision.risk.signals.includes('new_ip'));
  });

  it('R5: a new IP with no known location (local network, no database) is also only an alert', () => {
    const decision = assess({ ipSeen: false, locationKnown: false, countrySeen: false });
    assert.equal(decision.requireOtp, false);
    assert.equal(decision.sendNewIpAlert, true);
  });

  it('R6: a trusted device on a known IP signs in with the password alone', () => {
    const decision = assess({});
    assert.equal(decision.requireOtp, false);
    assert.equal(decision.sendNewIpAlert, false);
    assert.equal(decision.risk.level, 'low');
  });

  it('a new IP address never refuses a sign-in by itself', () => {
    for (const deviceState of ['trusted', 'untrusted', 'new']) {
      const decision = assess({ deviceState, ipSeen: false, countrySeen: false });
      assert.ok(decision.requireOtp || decision.sendNewIpAlert);
      assert.equal('blocked' in decision, false);
    }
  });

  it('every new registration needs a code, whatever the browser', () => {
    const base = { purpose: 'register', deviceState: 'new', ipSeen: false, locationKnown: false, countrySeen: false, browserSeen: false, recentFailures: false };
    assert.deepEqual(assessSignIn({ ...base, isChrome: false }).otpReasons, ['new_account']);
    assert.deepEqual(assessSignIn({ ...base, isChrome: true }).otpReasons, ['new_account', 'chrome']);
  });
});

describe('progressive cooldowns', () => {
  it('account + IP: 5th failure 1 min, then 2, 4, 8, and at most 15 minutes', () => {
    assert.deepEqual([4, 5, 6, 7, 8, 9, 20].map((n) => accountIpCooldownMs(n) / 60000), [0, 1, 2, 4, 8, 15, 15]);
  });

  it('IP address: 20 failures 5 min, 30 failures 15 min, 40 or more 60 min', () => {
    assert.deepEqual([19, 20, 29, 30, 39, 40, 60].map((n) => ipCooldownMs(n) / 60000), [0, 5, 5, 15, 15, 60, 60]);
  });
});
