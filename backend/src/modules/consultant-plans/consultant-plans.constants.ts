export const WATER_SUPPLY_ASSETS = [
  { value: 'water-pipeline', label: 'Water Pipeline', category: 'Water Supply' },
  { value: 'overhead-reservoir', label: 'Overhead Reservoir (OHR)', category: 'Water Supply' },
  { value: 'stand-post', label: 'Stand Post', category: 'Water Supply' },
  { value: 'ro-plant', label: 'RO Plant', category: 'Water Supply' },
  { value: 'bore-hole', label: 'Bore Hole Location', category: 'Water Supply' },
  { value: 'tubewell-pump-room', label: 'Tubewell Pump Room', category: 'Water Supply' },
] as const;

export const SEWERAGE_ASSETS = [
  { value: 'abr', label: 'ABR', category: 'Sewerage' },
  { value: 'sewage-line', label: 'Sewage Line', category: 'Sewerage' },
  { value: 'manhole', label: 'Manhole', category: 'Sewerage' },
  { value: 'other-sewerage-asset', label: 'Other Sewerage Asset', category: 'Sewerage' },
] as const;

export const SUPPORT_ASSETS = [
  { value: 'guard-room', label: 'Guard Room', category: 'Support Facility' },
  { value: 'solar-installation', label: 'Solar Installation', category: 'Support Facility' },
  { value: 'water-support-asset', label: 'Other Water Support Asset', category: 'Support Facility' },
] as const;

export const CUSTOM_ASSETS = [{ value: 'custom-asset', label: 'Custom Asset', category: 'Custom' }] as const;

export type AssetDefinition = {
  value: string;
  label: string;
  category: string;
};

export const ASSET_DEFINITIONS: AssetDefinition[] = [
  ...WATER_SUPPLY_ASSETS,
  ...SEWERAGE_ASSETS,
  ...SUPPORT_ASSETS,
  ...CUSTOM_ASSETS,
];

export const DEFAULT_LAYER_NAME = 'PRMSC Red Book Assets';

export const READ_ROLES = [
  'Super Admin',
  'Admin',
  'DM Tehsil',
  'Tehsil DM',
  'Infra Engineer',
  'CID',
  'BCC Specialist',
  'BCC Officer Tehsil',
  'BCC Officer',
  'EDCS Consultant',
  'EDCS User',
  'Tehsil Manager',
  'RA Environment',
  'PCRWR Sampler',
  'PCRWR Lab',
] as const;

export const WRITE_ROLES = ['EDCS Consultant', 'EDCS User', 'Super Admin', 'Admin', 'Tehsil Manager'] as const;

export const MANAGE_ROLES = ['Super Admin', 'Admin', 'Tehsil Manager'] as const;

export const MAINTENANCE_ROLES = ['Super Admin', 'Admin', 'Tehsil Manager'] as const;

export const CONSULTANT_CREATOR_ROLES = ['EDCS Consultant', 'EDCS User'] as const;

export const PLAN_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export const UPLOAD_SUBDIR = 'documents';
export const MAX_UPLOAD_FILE_SIZE = 12 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 5;
