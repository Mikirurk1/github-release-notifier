import nodemailer from 'nodemailer';
import { env } from '@/config/env';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
}

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});

export const emailClient = {
  async sendMail(payload: EmailPayload): Promise<void> {
    await transporter.sendMail({
      from: env.smtpFrom,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });
  },
};
