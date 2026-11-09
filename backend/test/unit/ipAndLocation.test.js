import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { lookupLocation, setGeoReaderForTests } from '../../src/utils/geoip.js';
import { isPrivateIp, normalizeIp, parseTrustProxy } from '../../src/utils/ip.js';

describe('IP addresses', () => {
  it('removes the IPv6 prefix from IPv4 addresses', () => {
    assert.equal(normalizeIp('::ffff:203.0.113.5'), '203.0.113.5');
    assert.equal(normalizeIp('2001:db8::1'), '2001:db8::1');
    assert.equal(normalizeIp(undefined), '');
  });

  it('recognises addresses that are not on the public internet', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.5', '169.254.1.1', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '', 'garbage']) {
      assert.equal(isPrivateIp(ip), true, ip);
    }
    for (const ip of ['8.8.8.8', '203.0.113.5', '172.32.0.1', '100.128.0.1', '2001:4860:4860::8888']) {
      assert.equal(isPrivateIp(ip), false, ip);
    }
  });

  it('never trusts every proxy', () => {
    assert.equal(parseTrustProxy(undefined), 'loopback');
    assert.equal(parseTrustProxy('true'), 'loopback');
    assert.equal(parseTrustProxy('1'), 1);
    assert.equal(parseTrustProxy('0'), 0);
    assert.equal(parseTrustProxy('false'), false);
    assert.equal(parseTrustProxy('loopback, 10.0.0.0/8'), 'loopback, 10.0.0.0/8');
  });
});

describe('approximate location', () => {
  afterEach(() => setGeoReaderForTests(null));

  it('shows local addresses as the local network', () => {
    assert.deepEqual(lookupLocation('::1'), { kind: 'local' });
    assert.deepEqual(lookupLocation('192.168.1.20'), { kind: 'local' });
  });

  it('is unknown without the database', () => {
    assert.deepEqual(lookupLocation('8.8.8.8'), { kind: 'unknown' });
    assert.deepEqual(lookupLocation(''), { kind: 'unknown' });
  });

  it('keeps only city, region and country from the database', () => {
    setGeoReaderForTests({
      get: () => ({
        city: { names: { en: 'Mumbai' } },
        subdivisions: [{ names: { en: 'Maharashtra' } }],
        country: { iso_code: 'IN', names: { en: 'India' } },
        location: { latitude: 19.07, longitude: 72.87 },
      }),
    });
    assert.deepEqual(lookupLocation('203.0.113.5'), { kind: 'approximate', city: 'Mumbai', region: 'Maharashtra', country: 'India', countryCode: 'IN' });
  });

  it('is unknown when the database has no record or the lookup fails', () => {
    setGeoReaderForTests({ get: () => null });
    assert.deepEqual(lookupLocation('203.0.113.5'), { kind: 'unknown' });
    setGeoReaderForTests({ get: () => { throw new Error('corrupt'); } });
    assert.deepEqual(lookupLocation('203.0.113.5'), { kind: 'unknown' });
  });
});
