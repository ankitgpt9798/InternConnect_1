import nodemailer from 'nodemailer';
import { emailSettings } from './emailConfig.js';

// Local development: the Mailtrap sandbox (nothing reaches real inboxes). Render: Brevo SMTP over an encrypted
// connection, delivering to each student's own address. See emailConfig.js. The message text (which may contain a
// code) is never logged.
const settings = emailSettings();
const transporter = nodemailer.createTransport(settings.transport);

export function sendEmail({ to, subject, text }) {
  return transporter.sendMail({ from: settings.from, to, subject, text });
}
