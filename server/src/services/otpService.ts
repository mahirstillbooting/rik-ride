import crypto from 'crypto';
import { OtpRecord, OtpPurpose, IOtpRecord } from '../models/OtpRecord';
import { emailService } from './emailService';

export interface CreateOtpResult {
  success: boolean;
  message?: string;
  cooldownSeconds?: number;
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  message?: string;
  resetToken?: string;
  error?: string;
  remainingAttempts?: number;
}

export class OtpService {
  /**
   * Hashes a 6-digit numeric OTP using SHA-256.
   */
  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Generates a cryptographically secure 6-digit numeric OTP string.
   */
  public generateSecureOtp(): string {
    const num = crypto.randomInt(100000, 1000000);
    return num.toString();
  }

  /**
   * Generates a random secure hex token for password reset verification.
   */
  public generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Creates, saves, and dispatches a new OTP for the specified email and purpose.
   */
  public async createAndSendOtp(
    email: string,
    purpose: OtpPurpose,
    userName?: string
  ): Promise<CreateOtpResult> {
    const cleanEmail = email.trim().toLowerCase();

    // Check for existing active OTP and resend cooldown
    const existingRecord = await OtpRecord.findOne({
      email: cleanEmail,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (existingRecord) {
      const now = new Date();
      if (existingRecord.resendCooldownUntil > now) {
        const cooldownMs = existingRecord.resendCooldownUntil.getTime() - now.getTime();
        const cooldownSeconds = Math.ceil(cooldownMs / 1000);
        return {
          success: false,
          error: `Please wait ${cooldownSeconds} seconds before requesting a new OTP code.`,
          cooldownSeconds,
        };
      }

      // Invalidate previous OTP when requesting a new one after cooldown
      existingRecord.isUsed = true;
      await existingRecord.save();
    }

    // Generate new OTP & set 10-minute expiry + 60-second resend cooldown
    const otpCode = this.generateSecureOtp();
    const otpHash = this.hashOtp(otpCode);
    const now = Date.now();
    const expiresAt = new Date(now + 10 * 60 * 1000); // 10 minutes
    const resendCooldownUntil = new Date(now + 60 * 1000); // 60 seconds

    await OtpRecord.create({
      email: cleanEmail,
      otpHash,
      purpose,
      attempts: 0,
      resendCooldownUntil,
      expiresAt,
      isUsed: false,
    });

    // Send email via emailService
    await emailService.sendOtpEmail({
      toEmail: cleanEmail,
      otpCode,
      purpose,
      userName,
      validMinutes: 10,
    });

    return {
      success: true,
      message: 'Verification OTP sent to your registered email address.',
      cooldownSeconds: 60,
    };
  }

  /**
   * Verifies an OTP submitted by the user.
   */
  public async verifyOtp(
    email: string,
    otpCode: string,
    purpose: OtpPurpose
  ): Promise<VerifyOtpResult> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      return { success: false, error: 'Please enter a valid 6-digit numeric OTP code.' };
    }

    const record = await OtpRecord.findOne({
      email: cleanEmail,
      purpose,
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!record) {
      return {
        success: false,
        error: 'No active OTP request found for this email address. Please request a new code.',
      };
    }

    // Check expiration
    if (record.expiresAt < new Date()) {
      record.isUsed = true;
      await record.save();
      return {
        success: false,
        error: 'OTP expired. Please request a new verification code.',
      };
    }

    // Check maximum attempts limit (max 5)
    if (record.attempts >= 5) {
      record.isUsed = true;
      await record.save();
      return {
        success: false,
        error: 'Maximum OTP verification attempts exceeded. Please request a new code.',
        remainingAttempts: 0,
      };
    }

    const inputHash = this.hashOtp(cleanOtp);
    if (inputHash !== record.otpHash) {
      record.attempts += 1;
      const remainingAttempts = Math.max(0, 5 - record.attempts);

      if (record.attempts >= 5) {
        record.isUsed = true;
      }
      await record.save();

      return {
        success: false,
        error:
          remainingAttempts > 0
            ? `Invalid OTP code. ${remainingAttempts} attempt(s) remaining.`
            : 'Maximum OTP verification attempts exceeded. Please request a new code.',
        remainingAttempts,
      };
    }

    // OTP verified successfully! Mark OTP record as used.
    record.isUsed = true;

    let resetToken: string | undefined;
    if (purpose === 'FORGOT_PASSWORD') {
      resetToken = this.generateResetToken();
      record.resetTokenHash = this.hashOtp(resetToken);
    }

    await record.save();

    return {
      success: true,
      message: 'OTP verified successfully.',
      resetToken,
    };
  }

  /**
   * Validates a single-use reset token for password reset authorization.
   */
  public async validateAndConsumeResetToken(email: string, resetToken: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const tokenHash = this.hashOtp(resetToken.trim());

    const record = await OtpRecord.findOne({
      email: cleanEmail,
      purpose: 'FORGOT_PASSWORD',
      resetTokenHash: tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return false;
    }

    // Clear reset token hash so it cannot be reused
    record.resetTokenHash = undefined;
    await record.save();
    return true;
  }
}

export const otpService = new OtpService();
