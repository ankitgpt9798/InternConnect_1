import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { isRestrictedDevice, mobileSessionExpiry, mobileWindowStatus } from '../../src/utils/mobileLoginWindow.js';

// India is UTC+05:30 all year, so 10:00 IST = 04:30 UTC and 13:00 IST = 07:30 UTC.
const ist = (hours, minutes, seconds = 0, day = 9) => new Date(Date.UTC(2026, 10, day, hours, minutes, seconds) - (5 * 60 + 30) * 60000);

afterEach(() => {
  delete process.env.MOBILE_LOGIN_WINDOW_TEST;
  delete process.env.MOBILE_SESSION_TEST_MINUTES;
  process.env.NODE_ENV = 'test';
});

describe('phone and tablet sign-in window (10:00 AM to 1:00 PM IST)', () => {
  const cases = [
    [ist(0, 0), false],
    [ist(9, 59, 59), false],
    [ist(10, 0, 0), true],
    [ist(11, 30), true],
    [ist(12, 59, 59), true],
    [ist(13, 0, 0), false],
    [ist(23, 59, 59), false],
  ];
  for (const [at, open] of cases) {
    it(`${at.toISOString()} -> ${open ? 'open' : 'closed'}`, () => {
      assert.equal(mobileWindowStatus(at).open, open);
    });
  }

  it('says when the window opens next', () => {
    assert.equal(mobileWindowStatus(ist(9, 0)).opensAt.getTime(), ist(10, 0).getTime());
    assert.equal(mobileWindowStatus(ist(13, 0)).opensAt.getTime(), ist(10, 0, 0, 10).getTime());
    assert.equal(mobileWindowStatus(ist(11, 0)).closesAt.getTime(), ist(13, 0).getTime());
  });

  it('only phones and tablets are restricted', () => {
    assert.equal(isRestrictedDevice('mobile'), true);
    assert.equal(isRestrictedDevice('tablet'), true);
    assert.equal(isRestrictedDevice('desktop'), false);
    assert.equal(isRestrictedDevice('unknown'), false);
  });
});

describe('phone and tablet sessions end at exactly 1:00 PM IST', () => {
  it('from any start time inside the window', () => {
    assert.equal(mobileSessionExpiry(ist(10, 0)).getTime(), ist(13, 0).getTime());
    assert.equal(mobileSessionExpiry(ist(12, 59, 59)).getTime(), ist(13, 0).getTime());
  });

  it('the next 1 PM when a test override let the session start later', () => {
    assert.equal(mobileSessionExpiry(ist(15, 0)).getTime(), ist(13, 0, 0, 10).getTime());
  });
});

describe('local testing overrides', () => {
  it('MOBILE_LOGIN_WINDOW_TEST forces the window open or closed', () => {
    process.env.MOBILE_LOGIN_WINDOW_TEST = 'open';
    assert.equal(mobileWindowStatus(ist(20, 0)).open, true);
    process.env.MOBILE_LOGIN_WINDOW_TEST = 'closed';
    assert.equal(mobileWindowStatus(ist(11, 0)).open, false);
  });

  it('MOBILE_SESSION_TEST_MINUTES ends sessions sooner', () => {
    process.env.MOBILE_SESSION_TEST_MINUTES = '2';
    assert.equal(mobileSessionExpiry(ist(10, 0)).getTime(), ist(10, 2).getTime());
  });

  it('both are ignored in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.MOBILE_LOGIN_WINDOW_TEST = 'open';
    process.env.MOBILE_SESSION_TEST_MINUTES = '2';
    assert.equal(mobileWindowStatus(ist(20, 0)).open, false);
    assert.equal(mobileSessionExpiry(ist(10, 0)).getTime(), ist(13, 0).getTime());
  });
});
