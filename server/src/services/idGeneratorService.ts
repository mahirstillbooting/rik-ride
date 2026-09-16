import { Garage } from '../models/Garage';
import { Vehicle } from '../models/Vehicle';

/**
 * Helper to derive standard 2-3 letter uppercase city code
 */
export function getCityCode(city?: string): string {
  if (!city) return 'DH';
  const clean = city.trim().toUpperCase();
  const knownCities: Record<string, string> = {
    DHAKA: 'DH',
    CHATTOGRAM: 'CTG',
    CHITTAGONG: 'CTG',
    SYLHET: 'SYL',
    RAJSHAHI: 'RAJ',
    KHULNA: 'KHU',
    BARISHAL: 'BAR',
    RANGPUR: 'RAN',
    MYMENSINGH: 'MYM',
    COMILLA: 'COM',
    CUMILLA: 'COM',
    GAZIPUR: 'GAZ',
    NARAYANGANJ: 'NAR',
  };
  if (knownCities[clean]) return knownCities[clean];
  return clean.replace(/[^A-Z]/g, '').slice(0, 3) || 'DH';
}

/**
 * Generate structured human-readable Garage ID
 * Format: [CITYCODE]-GAR-[SEQ:0001] (e.g. DH-GAR-0001, CTG-GAR-0002)
 */
export async function generateGarageId(cityName?: string): Promise<{ garageId: string; cityCode: string }> {
  const cityCode = getCityCode(cityName || 'Dhaka');
  const prefix = `${cityCode}-GAR-`;

  const latestGarage = await Garage.findOne({
    garageId: { $regex: `^${prefix}` },
  })
    .sort({ createdAt: -1, garageId: -1 })
    .select('garageId')
    .lean();

  let nextSeq = 1;
  if (latestGarage && latestGarage.garageId) {
    const parts = latestGarage.garageId.split('-');
    const lastNumStr = parts[parts.length - 1];
    const parsed = parseInt(lastNumStr, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  let exists = await Garage.exists({ garageId: candidate });

  while (exists) {
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    exists = await Garage.exists({ garageId: candidate });
  }

  return { garageId: candidate, cityCode };
}

/**
 * Generate structured human-readable Vehicle ID for Garage-Owned Rickshaw
 * Format: [GARAGE_ID]-V[SEQ:001] (e.g. DH-GAR-0001-V001)
 */
export async function generateGarageVehicleId(garageCustomId: string): Promise<string> {
  const prefix = `${garageCustomId}-V`;

  const latestVehicle = await Vehicle.findOne({
    vehicleId: { $regex: `^${prefix}` },
  })
    .sort({ createdAt: -1, vehicleId: -1 })
    .select('vehicleId')
    .lean();

  let nextSeq = 1;
  if (latestVehicle && latestVehicle.vehicleId) {
    const parts = latestVehicle.vehicleId.split('-V');
    if (parts.length > 1) {
      const lastNumStr = parts[parts.length - 1];
      const parsed = parseInt(lastNumStr, 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  let candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
  let exists = await Vehicle.exists({ vehicleId: candidate });

  while (exists) {
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    exists = await Vehicle.exists({ vehicleId: candidate });
  }

  return candidate;
}

/**
 * Generate structured human-readable Vehicle ID for Self-Owned Rickshaw
 * Format: [CITYCODE]-OWN-[SEQ:0001] (e.g. DH-OWN-0001)
 */
export async function generateSelfOwnedVehicleId(cityName?: string): Promise<{ vehicleId: string; cityCode: string }> {
  const cityCode = getCityCode(cityName || 'Dhaka');
  const prefix = `${cityCode}-OWN-`;

  const latestVehicle = await Vehicle.findOne({
    vehicleId: { $regex: `^${prefix}` },
  })
    .sort({ createdAt: -1, vehicleId: -1 })
    .select('vehicleId')
    .lean();

  let nextSeq = 1;
  if (latestVehicle && latestVehicle.vehicleId) {
    const parts = latestVehicle.vehicleId.split('-');
    const lastNumStr = parts[parts.length - 1];
    const parsed = parseInt(lastNumStr, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  let exists = await Vehicle.exists({ vehicleId: candidate });

  while (exists) {
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    exists = await Vehicle.exists({ vehicleId: candidate });
  }

  return { vehicleId: candidate, cityCode };
}
