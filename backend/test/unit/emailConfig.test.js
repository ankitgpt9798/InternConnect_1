import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeEmail, emailConfigProblems, emailSettings } from '../../src/utils/emailConfig.js';

const MAILTRAP = { MAILTRAP_USER: 'user', MAILTRAP_PASS: 'secret-pass' };
const BREVO = {
  SMTP_HOST: 'smtp-relay.brevo.com',
  SMTP_PORT: '2525',
  SMTP_USER: 'login@smtp-brevo.com',
  SMTP_PASS: 'secret-smtp-key',
  EMAIL_FROM: 'InternConnect <project.mailbox@example.com>',
};

describe('email settings: Mailtrap locally, Brevo SMTP on Render', () => {
  it('local development uses the Mailtrap sandbox', () => {
    const env = { NODE_ENV: 'development', ...MAILTRAP };
    const { provider, transport } = emailSettings(env);
    assert.equal(provider, 'mailtrap');
    assert.deepEqual({ host: transport.host, port: transport.port }, { host: 'sandbox.smtp.mailtrap.io', port: 2525 });
    assert.deepEqual(emailConfigProblems(env), []);
    assert.equal(describeEmail(env), 'Mailtrap sandbox');
  });

  it('production uses Brevo with an encrypted connection: STARTTLS required, certificate and name checked, TLS 1.2+', () => {
    const env = { NODE_ENV: 'production', ...BREVO };
    const { provider, transport, from } = emailSettings(env);
    assert.equal(provider, 'smtp');
    assert.equal(transport.host, 'smtp-relay.brevo.com');
    assert.equal(transport.port, 2525);
    assert.equal(transport.secure, false);
    assert.equal(transport.requireTLS, true, 'no plain-text fallback');
    assert.deepEqual(transport.tls, { rejectUnauthorized: true, minVersion: 'TLSv1.2', servername: 'smtp-relay.brevo.com' });
    assert.deepEqual(transport.auth, { user: BREVO.SMTP_USER, pass: BREVO.SMTP_PASS });
    assert.equal(from, BREVO.EMAIL_FROM);
    assert.deepEqual(emailConfigProblems(env), []);
  });

  it('every SMTP port is encrypted: 465 with TLS from the start, 587 and 2525 with required STARTTLS; 2525 is the default', () => {
    const at = (SMTP_PORT) => emailSettings({ ...BREVO, SMTP_PORT }).transport;
    assert.deepEqual([at('465').secure, at('465').requireTLS], [true, false]);
    assert.deepEqual([at('587').secure, at('587').requireTLS], [false, true]);
    assert.equal(at('').port, 2525);
    for (const port of ['465', '587', '2525']) assert.equal(at(port).tls.rejectUnauthorized, true, port);
  });

  it('production never falls back to the sandbox and never starts without Brevo (no silent bypass of the codes)', () => {
    assert.match(emailConfigProblems({ NODE_ENV: 'production', ...MAILTRAP })[0], /SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM/);
    assert.match(emailConfigProblems({ NODE_ENV: 'production', ...BREVO, SMTP_PASS: '' })[0], /SMTP_PASS/);
    assert.match(emailConfigProblems({ NODE_ENV: 'production', ...BREVO, SMTP_HOST: 'sandbox.smtp.mailtrap.io' })[0], /sandbox/);
    assert.match(emailConfigProblems({ NODE_ENV: 'production', ...BREVO, EMAIL_FROM: 'InternConnect' })[0], /EMAIL_FROM/);
    assert.deepEqual(emailConfigProblems({ NODE_ENV: 'production', ...BREVO, EMAIL_FROM: 'project.mailbox@example.com' }), []);
  });

  it('production refuses NODE_TLS_REJECT_UNAUTHORIZED=0 (certificate checks off for every connection)', () => {
    assert.match(emailConfigProblems({ NODE_ENV: 'production', ...BREVO, NODE_TLS_REJECT_UNAUTHORIZED: '0' })[0], /certificate checks/);
  });

  it('the startup log line names the server and the encryption, never the login or the key', () => {
    const line = describeEmail({ NODE_ENV: 'production', ...BREVO });
    assert.equal(line, 'SMTP smtp-relay.brevo.com:2525 (STARTTLS required, certificate checked)');
    assert.ok(!line.includes('secret') && !line.includes('login@'));
  });

  it('local development without any email settings is refused; a local catcher can stand in for Mailtrap', () => {
    assert.match(emailConfigProblems({ NODE_ENV: 'development' })[0], /MAILTRAP_USER, MAILTRAP_PASS/);
    const catcher = { ...MAILTRAP, MAILTRAP_HOST: '127.0.0.1', MAILTRAP_PORT: '2526' };
    assert.equal(describeEmail(catcher), 'Mailtrap-compatible server 127.0.0.1:2526');
  });
});
