import crypto from 'crypto';
import { env } from '../config/env';

export interface QRVerificationResult {
  valid: boolean;
  registrationNumber?: string;
  timestamp?: number;
  reason?: string;
}

/**
 * Cryptographic QR Token Service
 * Generates and verifies signed public vehicle QR identifiers
 * NEVER exposes raw MongoDB _id or sensitive vehicle details.
 */
export class QRService {
  /**
   * Generates a cryptographically signed QR identifier token.
   */
  public generateSignedToken(registrationNumber: string): string {
    const timestamp = Date.now();
    const payload = `${registrationNumber.toUpperCase()}:${timestamp}`;
    const hmac = crypto
      .createHmac('sha256', env.qrHmacSecret)
      .update(payload)
      .digest('hex')
      .slice(0, 16);

    return `RR-V1-${Buffer.from(payload).toString('base64url')}-${hmac}`;
  }

  /**
   * Validates a public QR token string and checks cryptographic signature authenticity.
   */
  public verifyToken(qrToken: string): QRVerificationResult {
    try {
      if (!qrToken.startsWith('RR-V1-')) {
        return { valid: false, reason: 'Invalid QR token format' };
      }

      const parts = qrToken.split('-');
      if (parts.length !== 4) {
        return { valid: false, reason: 'Malformed QR token structure' };
      }

      const encodedPayload = parts[2];
      const receivedHmac = parts[3];

      const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const [registrationNumber, timestampStr] = payload.split(':');

      const expectedHmac = crypto
        .createHmac('sha256', env.qrHmacSecret)
        .update(payload)
        .digest('hex')
        .slice(0, 16);

      if (receivedHmac !== expectedHmac) {
        return { valid: false, reason: 'Cryptographic signature mismatch' };
      }

      return {
        valid: true,
        registrationNumber,
        timestamp: parseInt(timestampStr, 10),
      };
    } catch (error) {
      return { valid: false, reason: 'Token decoding failure' };
    }
  }
}

export const qrService = new QRService();
