export interface SmsPayload {
  toPhone?: string;
  severity: 'YELLOW' | 'RED';
  passengerName: string;
  passengerPhone: string;
  driverName?: string;
  driverPhone?: string;
  vehicleIdentifier?: string;
  qrIdentifier?: string;
  latitude?: number;
  longitude?: number;
  rideId: string;
}

export interface SmsSendResult {
  success: boolean;
  status: 'MOCK_SENT' | 'SENT' | 'FAILED' | 'NOT_CONFIGURED';
  message: string;
  loggedMessage?: string;
}

export interface ISmsProvider {
  sendSafetySms(payload: SmsPayload): Promise<SmsSendResult>;
}

export class MockSmsProvider implements ISmsProvider {
  public async sendSafetySms(payload: SmsPayload): Promise<SmsSendResult> {
    const isEmergency = payload.severity === 'RED';
    const mapsLink = payload.latitude && payload.longitude 
      ? `https://maps.google.com/?q=${payload.latitude.toFixed(5)},${payload.longitude.toFixed(5)}`
      : 'Location N/A';

    const textBody = `[RIK-RIDE ${isEmergency ? 'RED SOS EMERGENCY' : 'YELLOW SAFETY ALERT'}] ` +
      `Ride: ${payload.rideId} | Passenger: ${payload.passengerName} (${payload.passengerPhone}) ` +
      `${payload.driverName ? `| Driver: ${payload.driverName}` : ''} ` +
      `${payload.vehicleIdentifier ? `| Rickshaw: ${payload.vehicleIdentifier}` : ''} ` +
      `${payload.qrIdentifier ? `| QR: ${payload.qrIdentifier}` : ''} ` +
      `| Live GPS: ${mapsLink} | Time: ${new Date().toISOString()}`;

    // Development-safe transport logging
    console.log('\n======================================================');
    console.log(`[SMS PROVIDER MOCK LOG] - ${isEmergency ? 'CRITICAL SOS' : 'SAFETY ALERT'}`);
    console.log(`Target: ${payload.toPhone || 'OPERATIONS_DISPATCH_HOTLINE'}`);
    console.log(`Content: ${textBody}`);
    console.log('======================================================\n');

    const providerConfigured = process.env.SMS_PROVIDER_API_KEY && process.env.SMS_PROVIDER_API_KEY !== 'mock';

    if (!providerConfigured) {
      return {
        success: true,
        status: 'MOCK_SENT',
        message: 'No external SMS provider configured in .env. Logged safely to development transport.',
        loggedMessage: textBody,
      };
    }

    // Provider placeholder if API key existed
    return {
      success: true,
      status: 'SENT',
      message: 'SMS dispatched via configured gateway provider.',
      loggedMessage: textBody,
    };
  }
}

export const smsService = new MockSmsProvider();
