import nodemailer from 'nodemailer';

// Mailtrap Email Testing keeps every email in a sandbox inbox (mailtrap.io) and never delivers it to real addresses.
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
  port: Number(process.env.MAILTRAP_PORT) || 2525,
  auth: { user: process.env.MAILTRAP_USER, pass: process.env.MAILTRAP_PASS },
});

export function sendEmail({ to, subject, text }) {
  return transporter.sendMail({ from: '"InternConnect" <no-reply@internconnect.test>', to, subject, text });
}
