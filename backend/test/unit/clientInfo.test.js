import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bindingFromUserAgent, getClientInfo, parseBrandHeader, sameBinding, sanitizeClientHints } from '../../src/utils/clientInfo.js';
import { HINTS, UA } from '../fixtures/userAgents.js';
import { fakeRequest } from '../helpers/fakeRequest.js';

const info = (userAgent, { headers, hints } = {}) => getClientInfo(fakeRequest({ userAgent, headers }), hints);

describe('browser, system and device detection', () => {
  const cases = [
    // [fixture, browser, os, deviceClass, isChrome]
    ['chromeWindows', 'Chrome', 'Windows', 'desktop', true],
    ['chromeMac', 'Chrome', 'macOS', 'desktop', true],
    ['chromeLinux', 'Chrome', 'Linux', 'desktop', true],
    ['chromeOs', 'Chrome', 'Chrome OS', 'desktop', true],
    ['chromeAndroidPhone', 'Chrome', 'Android', 'mobile', true],
    ['chromeAndroidTablet', 'Chrome', 'Android', 'tablet', true],
    ['chromeGalaxyTab', 'Chrome', 'Android', 'tablet', true],
    ['chromeIphone', 'Chrome', 'iOS', 'mobile', true],
    ['chromeIpad', 'Chrome', 'iOS', 'tablet', true],
    ['edgeWindows', 'Microsoft Edge', 'Windows', 'desktop', false],
    ['edgeAndroid', 'Microsoft Edge', 'Android', 'mobile', false],
    ['edgeIphone', 'Microsoft Edge', 'iOS', 'mobile', false],
    ['firefoxWindows', 'Firefox', 'Windows', 'desktop', false],
    ['firefoxAndroid', 'Firefox', 'Android', 'mobile', false],
    ['firefoxIphone', 'Firefox', 'iOS', 'mobile', false],
    ['safariMac', 'Safari', 'macOS', 'desktop', false],
    ['safariIphone', 'Safari', 'iOS', 'mobile', false],
    ['safariIpad', 'Safari', 'iOS', 'tablet', false],
    ['samsungInternet', 'Samsung Internet', 'Android', 'mobile', false],
    ['operaWindows', 'Opera', 'Windows', 'desktop', false],
    ['androidWebView', 'Android WebView', 'Android', 'mobile', false],
  ];

  for (const [fixture, browser, os, deviceClass, isChrome] of cases) {
    it(`${fixture}: ${browser} on ${os}, ${deviceClass}, ${isChrome ? 'Chrome rule' : 'not Chrome'}`, () => {
      const client = info(UA[fixture]);
      assert.equal(client.browser.name, browser);
      assert.equal(client.os.name, os);
      assert.equal(client.deviceClass, deviceClass);
      assert.equal(client.isChrome, isChrome);
    });
  }

  it('reads the phone model when the browser shows it', () => {
    assert.equal(info(UA.samsungInternet).model, 'SM-S918B');
    assert.equal(info(UA.chromeGalaxyTab).model, 'SM-X710');
    assert.equal(info(UA.androidWebView).model, 'Pixel 8');
    assert.equal(info(UA.chromeIphone).model, 'iPhone');
    assert.equal(info(UA.chromeAndroidPhone).model, ''); // Chrome hides it ("K")
    assert.equal(info(UA.chromeAndroidPhone, { hints: { model: 'Pixel 7' } }).model, 'Pixel 7');
  });

  it('tells Windows 11 from Windows 10 with the platform version hint', () => {
    assert.equal(info(UA.chromeWindows).os.version, '10');
    assert.equal(info(UA.chromeWindows, { hints: { platformVersion: '15.0.0' } }).os.version, '11');
  });
});

describe('signals can only add restrictions', () => {
  it('treats Brave (Chrome User-Agent, Brave hints) as Chrome', () => {
    assert.equal(info(UA.chromeWindows, { headers: HINTS.braveDesktop }).isChrome, true);
  });

  it('treats any browser as Chrome when its Client Hints say Google Chrome', () => {
    assert.equal(info(UA.edgeWindows, { headers: HINTS.chromeDesktop }).isChrome, true);
    assert.equal(info(UA.firefoxWindows, { hints: { brands: ['Google Chrome'] } }).isChrome, true);
  });

  it('Edge Client Hints do not make Edge count as Chrome', () => {
    assert.equal(info(UA.edgeWindows, { headers: HINTS.edgeDesktop }).isChrome, false);
  });

  it('a mobile hint makes a desktop User-Agent a phone', () => {
    assert.equal(info(UA.chromeLinux, { headers: { 'sec-ch-ua-mobile': '?1' } }).deviceClass, 'mobile');
    assert.equal(info(UA.chromeWindows, { hints: { mobile: true } }).deviceClass, 'mobile');
  });

  it('an iPad showing desktop sites (Mac User-Agent with touch) is a tablet', () => {
    assert.equal(info(UA.safariMac, { hints: { touchMac: true } }).deviceClass, 'tablet');
    assert.equal(info(UA.safariMac).deviceClass, 'desktop');
  });

  it('a desktop hint cannot turn a phone into a computer', () => {
    assert.equal(info(UA.chromeAndroidPhone, { headers: { 'sec-ch-ua-mobile': '?0' } }).deviceClass, 'mobile');
  });
});

describe('unusual User-Agents', () => {
  it('handles a missing User-Agent', () => {
    const client = info('');
    assert.deepEqual([client.browser.name, client.os.name, client.deviceClass, client.isChrome], ['Unknown', 'Unknown', 'unknown', false]);
  });

  it('cuts a very long User-Agent to 512 characters', () => {
    const client = info(`${UA.firefoxWindows} ${'x'.repeat(2000)}`);
    assert.equal(client.userAgent.length, 512);
    assert.equal(client.browser.name, 'Firefox');
  });

  it('records the client IP without the IPv6 prefix', () => {
    assert.equal(getClientInfo(fakeRequest({ userAgent: UA.chromeWindows, ip: '::ffff:198.51.100.7' })).ip, '198.51.100.7');
  });
});

describe('session and device binding', () => {
  it('stays the same when the browser updates', () => {
    const v131 = bindingFromUserAgent(UA.chromeWindows);
    const v132 = bindingFromUserAgent(UA.chromeWindows.replace('Chrome/131', 'Chrome/132'));
    assert.ok(sameBinding(v131, v132));
  });

  it('changes with another browser, system or kind of device', () => {
    const chrome = bindingFromUserAgent(UA.chromeWindows);
    assert.equal(sameBinding(chrome, bindingFromUserAgent(UA.edgeWindows)), false);
    assert.equal(sameBinding(chrome, bindingFromUserAgent(UA.chromeMac)), false);
    assert.equal(sameBinding(bindingFromUserAgent(UA.chromeAndroidPhone), bindingFromUserAgent(UA.chromeLinux)), false); // "Desktop site"
  });

  it('ignores page hints, so the binding can be checked on every request', () => {
    const client = info(UA.safariMac, { hints: { touchMac: true } });
    assert.equal(client.deviceClass, 'tablet');
    assert.deepEqual(client.binding, bindingFromUserAgent(UA.safariMac));
  });
});

describe('input cleaning', () => {
  it('reads Client Hints brands', () => {
    assert.deepEqual(parseBrandHeader(HINTS.chromeDesktop['sec-ch-ua']), ['Google Chrome', 'Chromium', 'Not_A Brand']);
    assert.deepEqual(parseBrandHeader(undefined), []);
  });

  it('keeps only known page hints of the right type and length', () => {
    const hints = sanitizeClientHints({
      model: `<script>${'a'.repeat(100)}`,
      platformVersion: '15.0.0; drop',
      mobile: 'yes',
      touchMac: true,
      brands: [{ brand: 'Google Chrome' }, 42, 'Chromium'],
      extra: 'ignored',
    });
    assert.equal(hints.model.length, 60);
    assert.ok(!hints.model.includes('<'));
    assert.equal(hints.platformVersion, undefined);
    assert.equal(hints.mobile, undefined);
    assert.equal(hints.touchMac, true);
    assert.deepEqual(hints.brands, ['Google Chrome', 'Chromium']);
    assert.equal('extra' in hints, false);
    assert.deepEqual(sanitizeClientHints('nope'), {});
    assert.deepEqual(sanitizeClientHints([1, 2]), {});
  });
});
