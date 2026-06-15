import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Nodemailer transporter configured for Amazon SES SMTP credentials.
 */
const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_PORT === 465,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

/**
 * Send a password reset email containing the reset link.
 * @param to Recipient email address
 * @param resetUrl Full URL the user should visit to reset their password
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: 'Password Reset Request — Rhose',
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 60 minutes. If you did not request this, you can safely ignore this email.</p>
    `,
    text: `You requested a password reset. Visit the following link to set a new password:\n\n${resetUrl}\n\nThis link expires in 60 minutes. If you did not request this, you can safely ignore this email.`,
  });
}
