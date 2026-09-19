export interface OtpEmailPayload {
  toEmail: string;
  otpCode: string;
  purpose: 'FORGOT_PASSWORD' | 'EMAIL_VERIFICATION';
  userName?: string;
  validMinutes?: number;
}

export interface EmailSendResult {
  success: boolean;
  status: 'SENT' | 'MOCK_LOGGED' | 'FAILED';
  message: string;
}

export class EmailService {
  /**
   * Dispatches OTP email or logs to transport in development.
   */
  public async sendOtpEmail(payload: OtpEmailPayload): Promise<EmailSendResult> {
    const validMins = payload.validMinutes || 10;
    const isForgotPassword = payload.purpose === 'FORGOT_PASSWORD';
    const subject = isForgotPassword
      ? `[RIK-RIDE] Password Reset Security OTP: ${payload.otpCode}`
      : `[RIK-RIDE] Verify Your Email Address OTP: ${payload.otpCode}`;

    const textContent =
      `Hello ${payload.userName || 'Valued User'},\n\n` +
      `Your RIK-RIDE One-Time Password (OTP) is: ${payload.otpCode}\n\n` +
      `This code is valid for ${validMins} minutes. Do not share this OTP with anyone.\n` +
      `If you did not request this code, please ignore this message.\n\n` +
      `Best regards,\nRIK-RIDE Security Team`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background-color: #18181B; color: #F4F4F5; border-radius: 12px; border: 1px solid #27272A;">
        <div style="text-align: center; padding-bottom: 16px; border-bottom: 1px solid #27272A;">
          <span style="background-color: #D97706; color: #FFFFFF; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 999px; letter-spacing: 1px;">RIK-RIDE SECURITY</span>
          <h2 style="color: #FFFFFF; margin-top: 12px; margin-bottom: 4px;">${isForgotPassword ? 'Password Reset OTP' : 'Email Verification OTP'}</h2>
          <p style="color: #A1A1AA; font-size: 13px; margin: 0;">Use the 6-digit verification code below</p>
        </div>
        
        <div style="text-align: center; margin: 24px 0; background-color: #27272A; padding: 18px; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #F59E0B;">${payload.otpCode}</span>
          <p style="color: #71717A; font-size: 12px; margin-top: 8px; margin-bottom: 0;">Expires in ${validMins} minutes • Single-use only</p>
        </div>
        
        <p style="color: #A1A1AA; font-size: 13px; line-height: 1.5;">
          If you did not request this OTP code, please secure your account immediately or disregard this email. Never disclose this code to anyone, including RIK-RIDE staff.
        </p>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #27272A; font-size: 11px; color: #71717A; text-align: center;">
          © ${new Date().getFullYear()} RIK-RIDE Mobility Platform • Dhaka, Bangladesh
        </div>
      </div>
    `;

    const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

    // Development & Non-configured transport safety log
    console.log('\n======================================================');
    console.log(`[EMAIL SERVICE ${hasSmtpConfig ? 'SMTP DISPATCH' : 'DEV TRANSPORT LOG'}]`);
    console.log(`To: ${payload.toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP Code: ${payload.otpCode}`);
    console.log(`Purpose: ${payload.purpose}`);
    console.log('======================================================\n');

    if (!hasSmtpConfig) {
      return {
        success: true,
        status: 'MOCK_LOGGED',
        message: 'OTP generated and logged safely to transport (dev mode / SMTP not configured).',
      };
    }

    // Optional nodemailer transport send if configured
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"RIK-RIDE Security" <no-reply@rikride.com>',
        to: payload.toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      return {
        success: true,
        status: 'SENT',
        message: 'OTP email sent via SMTP server.',
      };
    } catch (err: any) {
      console.warn('[EmailService] SMTP send error (falling back to transport log):', err.message);
      return {
        success: true,
        status: 'MOCK_LOGGED',
        message: `SMTP delivery failed (${err.message}). Logged safely to server console.`,
      };
    }
  }
}

export const emailService = new EmailService();
