import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeEmail, emailConfigProblems, emailSettings } from '../../src/utils/emailConfig.js';

const BREVO = { SMTP_HOST: 'smtp-relay.brevo.com', SMTP_PORT: '587', SMTP_USER: 'login@smtp-brevo.com', SMTP_PASS: 'secret-key', EMAIL_FROM: 'InternConnect <no-reply@example.com>' };

describe('email settings (development: Mailtrap sandbox, production: Brevo SMTP)', () => {
  it('development uses the Mailtrap sandbox', () => {
    const env = { NODE_ENV: 'development', MAILTRAP_USER: 'u', MAILTRAP_PASS: 'p' };
    const settings = emailSettings(env);
    assert.equal(settings.provider, 'mailtrap');
    assert.equal(settings.transport.host, 'sandbox.smtp.mailtrap.io');
    assert.deepEqual(emailConfigProblems(env), []);
    assert.equal(describeEmail(env), 'Mailtrap sandbox');
  });

  it('development without Mailtrap or SMTP settings is refused', () => {
    assert.equal(emailConfigProblems({ NODE_ENV: 'development' }).length, 1);
  });

  it('production uses Brevo over TLS (port 587) with the verified sender', () => {
    const env = { NODE_ENV: 'production', ...BREVO };
    const settings = emailSettings(env);
    assert.equal(settings.provider, 'smtp');
    assert.deepEqual(
      { host: settings.transport.host, port: settings.transport.port, secure: settings.transport.secure, requireTLS: settings.transport.requireTLS },
      { host: 'smtp-relay.brevo.com', port: 587, secure: false, requireTLS: true },
    );
    assert.equal(settings.from, BREVO.EMAIL_FROM);
    assert.deepEqual(emailConfigProblems(env), []);
    assert.equal(describeEmail(env), 'SMTP smtp-relay.brevo.com:587');
    assert.ok(!describeEmail(env).includes('secret'), 'the log line never shows the password');
  });

  it('port 465 uses TLS from the start', () => {
    const settings = emailSettings({ ...BREVO, SMTP_PORT: '465' });
    assert.equal(settings.transport.secure, true);
    assert.equal(settings.transport.requireTLS, false);
  });

  it('production refuses missing SMTP settings, the Mailtrap sandbox and a sender without an address', () => {
    const onlyMailtrap = emailConfigProblems({ NODE_ENV: 'production', MAILTRAP_USER: 'u', MAILTRAP_PASS: 'p' });
    assert.match(onlyMailtrap[0], /SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM/);
    assert.match(emailConfigProblems({ NODE_ENV: 'production', ...BREVO, SMTP_PASS: '' })[0], /SMTP_PASS/);
    assert.match(emailConfigProblems({ NODE_ENV: 'production', ...BREVO, SMTP_HOST: 'sandbox.smtp.mailtrap.io' })[0], /sandbox/);
    assert.match(emailConfigProblems({ NODE_ENV: 'production', ...BREVO, EMAIL_FROM: 'InternConnect' })[0], /EMAIL_FROM/);
    assert.deepEqual(emailConfigProblems({ NODE_ENV: 'production', ...BREVO, EMAIL_FROM: 'no-reply@example.com' }), []);
  });

  it('a development SMTP server needs its login and sender too', () => {
    assert.match(emailConfigProblems({ NODE_ENV: 'development', SMTP_HOST: 'localhost' })[0], /SMTP_USER, SMTP_PASS, EMAIL_FROM/);
  });
});
