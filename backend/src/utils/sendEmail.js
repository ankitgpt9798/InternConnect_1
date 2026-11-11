import nodemailer from 'nodemailer';
import { emailSettings } from './emailConfig.js';

// Development and testing: the Mailtrap sandbox (nothing reaches real inboxes). Production: Brevo SMTP. See emailConfig.js.
const settings = emailSettings();
const transporter = nodemailer.createTransport(settings.transport);

export function sendEmail({ to, subject, text }) {
  return transporter.sendMail({ from: settings.from, to, subject, text });
}
