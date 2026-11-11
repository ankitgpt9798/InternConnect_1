// Which mail server InternConnect sends its emails through (sign-in codes, new passwords, invoices). Every setting comes
// from environment variables; nothing secret is written in the code.
//   Development and testing: Mailtrap Email Testing, a sandbox inbox that never delivers to real addresses
//     (MAILTRAP_USER, MAILTRAP_PASS; MAILTRAP_HOST and MAILTRAP_PORT are optional, e.g. for a local email catcher).
//   Production: a real SMTP service, Brevo (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and EMAIL_FROM, a sender address
//     verified in Brevo). Port 587 must switch to TLS before logging in; port 465 uses TLS from the start.
const SANDBOX_HOST = 'sandbox.smtp.mailtrap.io';
const DEV_FROM = '"InternConnect" <no-reply@internconnect.test>';

export function emailSettings(env = process.env) {
  if (env.SMTP_HOST) {
    const port = Number(env.SMTP_PORT) || 587;
    return {
      provider: 'smtp',
      transport: { host: env.SMTP_HOST, port, secure: port === 465, requireTLS: port === 587, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } },
      from: env.EMAIL_FROM,
    };
  }
  return {
    provider: 'mailtrap',
    transport: { host: env.MAILTRAP_HOST || SANDBOX_HOST, port: Number(env.MAILTRAP_PORT) || 2525, auth: { user: env.MAILTRAP_USER, pass: env.MAILTRAP_PASS } },
    from: env.EMAIL_FROM || DEV_FROM,
  };
}

const missing = (env, keys) => keys.filter((key) => !env[key]);
const hasAddress = (from) => /<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$|^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(String(from ?? '').trim());

// Problems that stop the server from starting. Production must use the real SMTP service, never the sandbox.
export function emailConfigProblems(env = process.env) {
  if (env.NODE_ENV === 'production') {
    const gaps = missing(env, ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']);
    if (gaps.length > 0) return [`Production sends real email through SMTP (Brevo): set ${gaps.join(', ')}. The Mailtrap sandbox is for development and testing only.`];
    if (env.SMTP_HOST.trim().toLowerCase() === SANDBOX_HOST) return ['SMTP_HOST is the Mailtrap sandbox, which never delivers email. Use the Brevo SMTP server in production.'];
    if (!hasAddress(env.EMAIL_FROM)) return ['EMAIL_FROM must be an email address, e.g. InternConnect <no-reply@your-domain.com> (verified in Brevo).'];
    return [];
  }
  if (env.SMTP_HOST) {
    const gaps = missing(env, ['SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']);
    return gaps.length > 0 ? [`SMTP_HOST is set, so also set ${gaps.join(', ')}.`] : [];
  }
  const gaps = missing(env, ['MAILTRAP_USER', 'MAILTRAP_PASS']);
  return gaps.length > 0 ? [`Set ${gaps.join(', ')} (Mailtrap Email Testing) for development, or SMTP_* for a real mail server.`] : [];
}

// "Brevo/SMTP smtp-relay.brevo.com:587" or "Mailtrap sandbox": for the startup log (never the login or password).
export function describeEmail(env = process.env) {
  const { provider, transport } = emailSettings(env);
  return provider === 'smtp' ? `SMTP ${transport.host}:${transport.port}` : `Mailtrap ${transport.host === SANDBOX_HOST ? 'sandbox' : `${transport.host}:${transport.port}`}`;
}
