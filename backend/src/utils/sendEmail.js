import nodemailer from 'nodemailer';
import { emailSettings } from './emailConfig.js';

// Mailtrap Email Testing keeps every email in a sandbox inbox (mailtrap.io) and never delivers it to real addresses.
const settings = emailSettings();
const transporter = nodemailer.createTransport(settings.transport);

export function sendEmail({ to, subject, text }) {
  return transporter.sendMail({ from: settings.from, to, subject, text });
}
