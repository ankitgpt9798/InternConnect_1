import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import maxmind from 'maxmind';
import { isPrivateIp } from './ip.js';

// Approximate location from the free MaxMind GeoLite2 City database, read from a file on this server.
// IP addresses are never sent to any outside service. Only city, region and country are kept (no coordinates).
// The location is approximate: it can be a nearby city, or a VPN's location instead of the student's.
const DEFAULT_PATH = fileURLToPath(new URL('../../data/GeoLite2-City.mmdb', import.meta.url));
let reader = null;

// Opens the database once at startup. Without it the app still works and locations show as "Unknown".
export async function loadGeoIp(path = process.env.GEOIP_DB_PATH || DEFAULT_PATH) {
  if (!existsSync(path)) return { loaded: false, path };
  reader = await maxmind.open(path, { watchForUpdates: true, watchForUpdatesNonPersistent: true });
  return { loaded: true, path };
}

// Tests only: a stand-in for the database (an object with get(ip)), or null.
export function setGeoReaderForTests(fakeReader) {
  reader = fakeReader;
}

// { kind: 'approximate', city, region, country, countryCode } | { kind: 'local' } | { kind: 'unknown' }
export function lookupLocation(ip) {
  if (!ip) return { kind: 'unknown' };
  if (isPrivateIp(ip)) return { kind: 'local' };
  if (!reader || !maxmind.validate(ip)) return { kind: 'unknown' };

  let record = null;
  try {
    record = reader.get(ip);
  } catch {
    record = null;
  }
  const country = record?.country ?? record?.registered_country;
  if (!country && !record?.city) return { kind: 'unknown' };
  return {
    kind: 'approximate',
    city: record.city?.names?.en ?? '',
    region: record.subdivisions?.[0]?.names?.en ?? '',
    country: country?.names?.en ?? '',
    countryCode: country?.iso_code ?? '',
  };
}
