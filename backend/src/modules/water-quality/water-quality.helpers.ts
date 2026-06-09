import {
  water_quality_sample_status_history_code,
  water_quality_sample_status_history_tone,
} from '@prisma/client';
import { MANAGER_ROLES, PCRWR_ROLES, RA_ROLES } from './water-quality.constants';

export function safeString(value: unknown): string {
  return (value ?? '').toString().trim();
}

export function isValidId(value: unknown): boolean {
  if (!value) {
    return false;
  }
  const num = Number(value);
  return num > 0 && Number.isFinite(num);
}

export function parseId(value: unknown): number | null {
  if (!value) {
    return null;
  }
  const num = Number(value);
  return num > 0 && Number.isFinite(num) ? num : null;
}

export function limitInt(value: unknown, fallback: number): number {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) {
    return Math.min(num, fallback);
  }
  return fallback;
}

export function escapeLike(value: unknown): string {
  return safeString(value).replace(/[%_\\]/g, '\\$&');
}

export function parseDate(raw: unknown): Date | null {
  if (!raw) {
    return null;
  }
  const date = new Date(raw as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseCoords(value: unknown): { lat: number; lng: number } | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return null;
    }
    try {
      return parseCoords(JSON.parse(text));
    } catch {
      const parts = text.split(',').map(Number);
      if (parts.length >= 2 && parts.every(Number.isFinite)) {
        return { lat: parts[0], lng: parts[1] };
      }
      return null;
    }
  }
  if (Array.isArray(value) && value.length >= 2) {
    const [lng, lat] = value.map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    const lat = Number(obj.lat ?? obj.latitude);
    const lng = Number(obj.lng ?? obj.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  return null;
}

export function parseMetrics(raw: unknown): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export function normalizeLabMetrics(metrics: Record<string, unknown> = {}) {
  const output = { ...(metrics || {}) };
  const mapping: Record<string, string[]> = {
    tehsil: ['tehsil', 'tehsil_name'],
    locationName: ['locationName', 'location', 'village', 'villageName'],
    settlementsOperational: [
      'settlementsOperational',
      'numberOfSettlementsOperational',
      'settlements',
    ],
    waterStatus: ['waterStatus', 'status'],
    color: ['color'],
    taste: ['taste'],
    odour: ['odour', 'odor'],
    ec: ['ec', 'conductivity', 'electricalConductivity'],
    turbidity: ['turbidity'],
    physicalContamination: ['physicalContamination', 'physical'],
    ph: ['ph'],
    hco3: ['hco3', 'bicarbonate'],
    co3: ['co3', 'carbonate'],
    calcium: ['calcium', 'ca'],
    magnesium: ['magnesium', 'mg'],
    hardness: ['hardness', 'totalHardness'],
    chloride: ['chloride', 'cl'],
    sodium: ['sodium', 'na'],
    potassium: ['potassium', 'k'],
    sulfate: ['sulfate', 'so4'],
    nitrate: ['nitrate', 'no3'],
    tds: ['tds'],
    phosphate: ['phosphate', 'po4'],
    iron: ['iron', 'fe'],
    nitrite: ['nitrite', 'no2'],
    fluoride: ['fluoride', 'f'],
    aluminum: ['aluminum', 'al'],
    arsenic: ['arsenic', 'as'],
    barium: ['barium', 'ba'],
    cadmium: ['cadmium', 'cd'],
    cobalt: ['cobalt', 'co'],
    chromium: ['chromium', 'cr'],
    copper: ['copper', 'cu'],
    manganese: ['manganese', 'mn'],
    molybdenum: ['molybdenum', 'mo'],
    nickel: ['nickel', 'ni'],
    lead: ['lead', 'pb'],
    strontium: ['strontium', 'sr'],
    zinc: ['zinc', 'zn'],
    chemicalContamination: ['chemicalContamination'],
    totalColiforms: ['totalColiforms', 'total_coliforms'],
    fecalColiforms: ['fecalColiforms', 'fecal_coliforms'],
    ecoli: ['ecoli', 'e_coli'],
    biologicalContamination: ['biologicalContamination'],
    remarks: ['remarks', 'labRemarks'],
    safe: ['safe'],
    unsafe: ['unsafe'],
  };

  const canonical: Record<string, unknown> = {};
  Object.entries(mapping).forEach(([targetKey, aliases]) => {
    for (const alias of aliases) {
      if (alias in output) {
        canonical[targetKey] = output[alias];
        break;
      }
    }
  });

  return canonical;
}

export function toneForStatus(code: string): water_quality_sample_status_history_tone {
  switch (code) {
    case 'critical_flagged':
      return water_quality_sample_status_history_tone.critical;
    case 'results_posted':
    case 'closed':
      return water_quality_sample_status_history_tone.success;
    default:
      return water_quality_sample_status_history_tone.info;
  }
}

export function labelForStatus(code: string): string {
  switch (code) {
    case 'critical_flagged':
      return 'Critical Flagged';
    case 'assignment':
      return 'Sampler Assigned';
    case 'collection_started':
      return 'Sampling Started';
    case 'collection_complete':
      return 'Sample Collected';
    case 'in_lab':
      return 'In Lab';
    case 'results_posted':
      return 'Lab Results Posted';
    case 'closed':
      return 'Closed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Updated';
  }
}

export function labelForRating(rating: string): string {
  switch (rating) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'fair':
      return 'Fair';
    case 'poor':
      return 'Poor';
    default:
      return 'Pending';
  }
}

export function buildStatusEvent(
  code: water_quality_sample_status_history_code,
  user: { userId?: number | string | bigint; name?: string },
  note: string,
) {
  return {
    code,
    label: labelForStatus(code),
    note: note || '',
    tone: toneForStatus(code),
    created_by: user?.userId ? BigInt(user.userId) : BigInt(0),
    created_by_name: safeString(user?.name),
  };
}

export function canCreate(role: string | undefined): boolean {
  return RA_ROLES.has(role || '') || MANAGER_ROLES.has(role || '');
}

export function canReadSample(
  user: { userId?: number | string | bigint; role?: string },
  sample: { created_by: bigint; assigned_sampler: bigint | null; status: string | null },
): boolean {
  const role = user?.role || '';
  if (MANAGER_ROLES.has(role)) {
    return true;
  }
  if (RA_ROLES.has(role)) {
    return Number(sample.created_by) === Number(user?.userId);
  }
  if (PCRWR_ROLES.has(role)) {
    return (
      Number(sample.assigned_sampler) === Number(user?.userId) ||
      ['awaiting_collection', 'collecting', 'in_lab', 'results_ready'].includes(
        sample.status || '',
      )
    );
  }
  return false;
}
