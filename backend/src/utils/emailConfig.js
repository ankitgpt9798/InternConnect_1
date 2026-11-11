// Every email InternConnect sends (sign-in codes, new passwords, invoices) goes to the Mailtrap Email Testing sandbox:
// an inbox at mailtrap.io that never delivers to real addresses. This is the same in development and in the Render
// demo; during a demo the codes are read from the Mailtrap inbox. All settings come from environment variables:
//   MAILTRAP_USER, MAILTRAP_PASS (required); MAILTRAP_HOST, MAILTRAP_PORT (optional, e.g. for a local email catcher).
const SANDBOX_HOST = 'sandbox.smtp.mailtrap.io';
const FROM = '"InternConnect" <no-reply@internconnect.test>';

export function emailSettings(env = process.env) {
  return {
    transport: {
      host: env.MAILTRAP_HOST || SANDBOX_HOST,
      port: Number(env.MAILTRAP_PORT) || 2525,
      auth: { user: env.MAILTRAP_USER, pass: env.MAILTRAP_PASS },
    },
    from: FROM,
  };
}

// Problems that stop the server from starting.
export function emailConfigProblems(env = process.env) {
  const missing = ['MAILTRAP_USER', 'MAILTRAP_PASS'].filter((key) => !env[key]);
  return missing.length > 0 ? [`Set ${missing.join(', ')} (Mailtrap Email Testing): sign-in codes and other emails are sent there.`] : [];
}

// "Mailtrap sandbox" (or the local catcher's address) for the startup log; never the login or password.
export function describeEmail(env = process.env) {
  const { host, port } = emailSettings(env).transport;
  return host === SANDBOX_HOST ? 'Mailtrap sandbox' : `Mailtrap-compatible server ${host}:${port}`;
}
