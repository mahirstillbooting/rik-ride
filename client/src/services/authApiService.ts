import { env } from '../config/env';

export interface AuthApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  cooldownSeconds?: number;
  resetToken?: string;
  token?: string;
  user?: T;
  accountStatus?: string;
  remainingAttempts?: number;
}

export const authApiService = {
  /**
   * Request OTP for Forgot Password flow
   */
  async requestForgotPasswordOtp(email: string): Promise<AuthApiResponse> {
    try {
      const res = await fetch(`${env.apiUrl}/api/auth/forgot-password/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: 'Network error or backend server unreachable' };
    }
  },

  /**
   * Verify OTP for Forgot Password flow
   */
  async verifyForgotPasswordOtp(email: string, otp: string): Promise<AuthApiResponse> {
    try {
      const res = await fetch(`${env.apiUrl}/api/auth/forgot-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: 'Network error or backend server unreachable' };
    }
  },

  /**
   * Complete password reset using single-use reset token
   */
  async resetPassword(email: string, resetToken: string, newPassword: string): Promise<AuthApiResponse> {
    try {
      const res = await fetch(`${env.apiUrl}/api/auth/forgot-password/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resetToken, newPassword }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: 'Network error or backend server unreachable' };
    }
  },

  /**
   * Request OTP for Registration email verification
   */
  async requestRegisterOtp(email: string, phone: string, role: string): Promise<AuthApiResponse> {
    try {
      const res = await fetch(`${env.apiUrl}/api/auth/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, role }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: 'Network error or backend server unreachable' };
    }
  },

  /**
   * Verify registration OTP and create account
   */
  async verifyAndRegister(payload: Record<string, any>): Promise<AuthApiResponse> {
    try {
      const res = await fetch(`${env.apiUrl}/api/auth/register/verify-and-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: 'Network error or backend server unreachable' };
    }
  },
};
