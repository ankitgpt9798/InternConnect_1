import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeEmail, emailConfigProblems, emailSettings } from '../../src/utils/emailConfig.js';

const MAILTRAP = { MAILTRAP_USER: 'user', MAILTRAP_PASS: 'secret-pass' };

describe('email settings (Mailtrap sandbox, locally and in the Render demo)', () => {
  it('development and production (Render) both use the Mailtrap sandbox', () => {
    for (const NODE_ENV of ['development', 'production']) {
      const env = { NODE_ENV, ...MAILTRAP };
      const { transport, from } = emailSettings(env);
      assert.deepEqual({ host: transport.host, port: transport.port }, { host: 'sandbox.smtp.mailtrap.io', port: 2525 }, NODE_ENV);
      assert.deepEqual(transport.auth, { user: 'user', pass: 'secret-pass' });
      assert.match(from, /InternConnect/);
      assert.deepEqual(emailConfigProblems(env), [], NODE_ENV);
      assert.equal(describeEmail(env), 'Mailtrap sandbox');
    }
  });

  it('refuses to start without the Mailtrap login', () => {
    assert.match(emailConfigProblems({ NODE_ENV: 'production' })[0], /MAILTRAP_USER, MAILTRAP_PASS/);
    assert.match(emailConfigProblems({ MAILTRAP_USER: 'user' })[0], /MAILTRAP_PASS/);
  });

  it('a local email catcher can stand in for Mailtrap (tests and rehearsals); the log never shows the password', () => {
    const env = { ...MAILTRAP, MAILTRAP_HOST: '127.0.0.1', MAILTRAP_PORT: '2526' };
    assert.deepEqual({ host: emailSettings(env).transport.host, port: emailSettings(env).transport.port }, { host: '127.0.0.1', port: 2526 });
    assert.equal(describeEmail(env), 'Mailtrap-compatible server 127.0.0.1:2526');
    assert.ok(!describeEmail(env).includes('secret'));
  });
});
