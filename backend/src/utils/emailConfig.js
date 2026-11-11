// Which mail server InternConnect sends its emails through (sign-in codes, password reset, invoices). Every setting comes
// from environment variables; no credential is written in the code or committed to GitHub.
//   Local development and tests: the Mailtrap Email Testing sandbox, which never delivers to real inboxes
//     (MAILTRAP_USER, MAILTRAP_PASS; optional MAILTRAP_HOST and MAILTRAP_PORT, e.g. for a local email catcher).
//   Render (production): Brevo SMTP, which delivers each email to the student's own address
//     (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and EMAIL_FROM, a sender verified in Brevo).
// The SMTP connection is always encrypted: port 465 uses TLS from the start; any other port (587, 2525) must switch to
// TLS (STARTTLS) before logging in, or the email is not sent. The server certificate is always checked.
import { isIP } from 'node:net';

const SANDBOX_HOST = 'sandbox.smtp.mailtrap.io';
const DEV_FROM = '"InternConnect" <no-reply@internconnect.test>';
const DEFAULT_SMTP_PORT = 2525; // Brevo also listens on 2525, which hosts block less often than 587

export function emailSettings(env = process.env) {
  if (env.SMTP_HOST) {
    const host = env.SMTP_HOST.trim();
    const port = Number(env.SMTP_PORT) || DEFAULT_SMTP_PORT;
    return {
      provider: 'smtp',
      transport: {
        host,
        port,
        secure: port === 465, // TLS from the first byte
        requireTLS: port !== 465, // otherwise STARTTLS is mandatory: no plain-text fallback
        // Check the certificate and the server name (a name such as smtp-relay.brevo.com, not an IP address).
        tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2', ...(isIP(host) ? {} : { servername: host }) },
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      },
      from: env.EMAIL_FROM,
    };
  }
  return {
    provider: 'mailtrap',
    transport: {
      host: env.MAILTRAP_HOST || SANDBOX_HOST,
      port: Number(env.MAILTRAP_PORT) || 2525,
      auth: { user: env.MAILTRAP_USER, pass: env.MAILTRAP_PASS },
    },
    from: env.EMAIL_FROM || DEV_FROM,
  };
}

const missing = (env, keys) => keys.filter((key) => !env[key]);
const hasAddress = (from) => /<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$|^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(String(from ?? '').trim());

// Problems that stop the server from starting. Production must deliver real email through SMTP (Brevo): it never falls
// back to the sandbox, where students could not read their codes, and never turns certificate checks off.
export function emailConfigProblems(env = process.env) {
  if (env.NODE_ENV === 'production') {
    const gaps = missing(env, ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']);
    if (gaps.length > 0) {
      return [`Production sends sign-in codes to each student's own email through Brevo SMTP: set ${gaps.join(', ')} in the Render dashboard (Environment). The Mailtrap sandbox is only for local development.`];
    }
    if (env.SMTP_HOST.trim().toLowerCase() === SANDBOX_HOST) return ['SMTP_HOST is the Mailtrap sandbox, which never delivers email to students. Use smtp-relay.brevo.com in production.'];
    if (!hasAddress(env.EMAIL_FROM)) return ['EMAIL_FROM must contain the sender verified in Brevo, e.g. InternConnect <your-project-mailbox@example.com>.'];
    if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') return ['NODE_TLS_REJECT_UNAUTHORIZED=0 turns off certificate checks for every connection. Remove it in production.'];
    return [];
  }
  if (env.SMTP_HOST) {
    const gaps = missing(env, ['SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']);
    return gaps.length > 0 ? [`SMTP_HOST is set, so also set ${gaps.join(', ')}.`] : [];
  }
  const gaps = missing(env, ['MAILTRAP_USER', 'MAILTRAP_PASS']);
  return gaps.length > 0 ? [`Set ${gaps.join(', ')} (Mailtrap Email Testing) for local development, or SMTP_* for a real mail server.`] : [];
}

// For the startup log: which server, never the login or the password.
export function describeEmail(env = process.env) {
  const { provider, transport } = emailSettings(env);
  if (provider === 'smtp') return `SMTP ${transport.host}:${transport.port} (${transport.secure ? 'TLS' : 'STARTTLS required'}, certificate checked)`;
  return transport.host === SANDBOX_HOST ? 'Mailtrap sandbox' : `Mailtrap-compatible server ${transport.host}:${transport.port}`;
}
