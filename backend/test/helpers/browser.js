import { HINTS, UA } from '../fixtures/userAgents.js';
import { latestCode } from './testServer.js';

// A tiny browser for the API tests: keeps cookies (respecting their path), sends a chosen User-Agent, Client Hints
// and IP address (as X-Forwarded-For, which the server trusts from 127.0.0.1).
export class Browser {
  constructor(base, { userAgent = UA.edgeWindows, headers = {}, ip = '203.0.113.10' } = {}) {
    this.base = base;
    this.userAgent = userAgent;
    this.headers = headers;
    this.ip = ip;
    this.jar = new Map();
  }

  cookie(name) {
    return this.jar.get(name)?.value ?? null;
  }

  cookieNames() {
    return [...this.jar.keys()];
  }

  storeCookies(response) {
    for (const raw of response.headers.getSetCookie()) {
      const [pair, ...attributes] = raw.split(';').map((part) => part.trim());
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator);
      const value = decodeURIComponent(pair.slice(separator + 1));
      const attrs = Object.fromEntries(
        attributes.map((attribute) => {
          const index = attribute.indexOf('=');
          return index < 0 ? [attribute.toLowerCase(), true] : [attribute.slice(0, index).toLowerCase(), attribute.slice(index + 1)];
        }),
      );
      const expired = (attrs['max-age'] !== undefined && Number(attrs['max-age']) <= 0) || (attrs.expires && new Date(attrs.expires).getTime() < 1e12);
      if (expired || value === '') this.jar.delete(name);
      else this.jar.set(name, { value, path: attrs.path || '/', attrs });
    }
  }

  async request(method, path, body) {
    const headers = { 'user-agent': this.userAgent, 'x-forwarded-for': this.ip, ...this.headers };
    const cookies = [...this.jar.entries()].filter(([, cookie]) => path.startsWith(cookie.path)).map(([name, cookie]) => `${name}=${cookie.value}`);
    if (cookies.length > 0) headers.cookie = cookies.join('; ');
    if (body !== undefined) headers['content-type'] = 'application/json';
    const response = await fetch(this.base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    this.storeCookies(response);
    const text = await response.text();
    let data = text;
    try {
      data = JSON.parse(text);
    } catch {
      // not JSON (e.g. a PDF)
    }
    return { status: response.status, data, headers: response.headers };
  }

  get(path) {
    return this.request('GET', path);
  }

  post(path, body = {}) {
    return this.request('POST', path, body);
  }

  // Sends a form with files (multipart/form-data), e.g. an internship application with a resume PDF.
  async postForm(path, form) {
    const headers = { 'user-agent': this.userAgent, 'x-forwarded-for': this.ip, ...this.headers };
    const cookies = [...this.jar.entries()].filter(([, cookie]) => path.startsWith(cookie.path)).map(([name, cookie]) => `${name}=${cookie.value}`);
    if (cookies.length > 0) headers.cookie = cookies.join('; ');
    const response = await fetch(this.base + path, { method: 'POST', headers, body: form });
    this.storeCookies(response);
    const text = await response.text();
    let data = text;
    try {
      data = JSON.parse(text);
    } catch {
      // not JSON
    }
    return { status: response.status, data, headers: response.headers };
  }

  // Downloads a file and returns its bytes.
  async download(path) {
    const headers = { 'user-agent': this.userAgent, 'x-forwarded-for': this.ip, ...this.headers };
    const cookies = [...this.jar.entries()].filter(([, cookie]) => path.startsWith(cookie.path)).map(([name, cookie]) => `${name}=${cookie.value}`);
    if (cookies.length > 0) headers.cookie = cookies.join('; ');
    const response = await fetch(this.base + path, { headers });
    this.storeCookies(response);
    return { status: response.status, bytes: Buffer.from(await response.arrayBuffer()), headers: response.headers };
  }

  login(student, client) {
    return this.post('/api/auth/login', { identifier: student.email, password: student.password, ...(client && { client }) });
  }

  async verifyLatestCode(email) {
    return this.post('/api/auth/login/verify', { otp: latestCode(email) });
  }

  // Registers and enters the emailed code: the student is then signed in on this browser (now a trusted device).
  async register(student) {
    const started = await this.post('/api/auth/register', student);
    if (started.status !== 202) throw new Error(`register: ${started.status} ${JSON.stringify(started.data)}`);
    const verified = await this.verifyLatestCode(student.email);
    if (verified.status !== 200) throw new Error(`register verify: ${verified.status} ${JSON.stringify(verified.data)}`);
    return verified;
  }
}

export const browsers = {
  edge: (base, ip) => new Browser(base, { userAgent: UA.edgeWindows, headers: HINTS.edgeDesktop, ip }),
  firefox: (base, ip) => new Browser(base, { userAgent: UA.firefoxWindows, ip }),
  safariMac: (base, ip) => new Browser(base, { userAgent: UA.safariMac, ip }),
  chrome: (base, ip) => new Browser(base, { userAgent: UA.chromeWindows, headers: HINTS.chromeDesktop, ip }),
  chromeAndroid: (base, ip) => new Browser(base, { userAgent: UA.chromeAndroidPhone, headers: HINTS.chromeAndroid, ip }),
  edgeAndroid: (base, ip) => new Browser(base, { userAgent: UA.edgeAndroid, ip }),
  chromeTablet: (base, ip) => new Browser(base, { userAgent: UA.chromeGalaxyTab, ip }),
  safariIphone: (base, ip) => new Browser(base, { userAgent: UA.safariIphone, ip }),
};
