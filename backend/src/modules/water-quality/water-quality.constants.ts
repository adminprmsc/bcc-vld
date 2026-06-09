export const ROLE_RA = 'RA Environment';
export const ROLE_SAMPLER = 'PCRWR Sampler';
export const ROLE_LAB = 'PCRWR Lab';

export const RA_ROLES = new Set([ROLE_RA]);
export const PCRWR_SAMPLER_ROLES = new Set([ROLE_SAMPLER]);
export const PCRWR_LAB_ROLES = new Set([ROLE_LAB]);
export const PCRWR_ROLES = new Set([...PCRWR_SAMPLER_ROLES, ...PCRWR_LAB_ROLES]);
export const MANAGER_ROLES = new Set(['Super Admin', 'Admin']);

export const ALLOWED_UPLOAD_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/plain',
]);

export const MAX_UPLOAD_BYTES = 16 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 5;
