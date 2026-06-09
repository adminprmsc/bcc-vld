"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_UPLOAD_FILES = exports.MAX_UPLOAD_FILE_SIZE = exports.UPLOAD_SUBDIR = exports.PLAN_ALLOWED_MIME_TYPES = exports.CONSULTANT_CREATOR_ROLES = exports.MAINTENANCE_ROLES = exports.MANAGE_ROLES = exports.WRITE_ROLES = exports.READ_ROLES = exports.DEFAULT_LAYER_NAME = exports.ASSET_DEFINITIONS = exports.CUSTOM_ASSETS = exports.SUPPORT_ASSETS = exports.SEWERAGE_ASSETS = exports.WATER_SUPPLY_ASSETS = void 0;
exports.WATER_SUPPLY_ASSETS = [
    { value: 'water-pipeline', label: 'Water Pipeline', category: 'Water Supply' },
    { value: 'overhead-reservoir', label: 'Overhead Reservoir (OHR)', category: 'Water Supply' },
    { value: 'stand-post', label: 'Stand Post', category: 'Water Supply' },
    { value: 'ro-plant', label: 'RO Plant', category: 'Water Supply' },
    { value: 'bore-hole', label: 'Bore Hole Location', category: 'Water Supply' },
    { value: 'tubewell-pump-room', label: 'Tubewell Pump Room', category: 'Water Supply' },
];
exports.SEWERAGE_ASSETS = [
    { value: 'abr', label: 'ABR', category: 'Sewerage' },
    { value: 'sewage-line', label: 'Sewage Line', category: 'Sewerage' },
    { value: 'manhole', label: 'Manhole', category: 'Sewerage' },
    { value: 'other-sewerage-asset', label: 'Other Sewerage Asset', category: 'Sewerage' },
];
exports.SUPPORT_ASSETS = [
    { value: 'guard-room', label: 'Guard Room', category: 'Support Facility' },
    { value: 'solar-installation', label: 'Solar Installation', category: 'Support Facility' },
    { value: 'water-support-asset', label: 'Other Water Support Asset', category: 'Support Facility' },
];
exports.CUSTOM_ASSETS = [{ value: 'custom-asset', label: 'Custom Asset', category: 'Custom' }];
exports.ASSET_DEFINITIONS = [
    ...exports.WATER_SUPPLY_ASSETS,
    ...exports.SEWERAGE_ASSETS,
    ...exports.SUPPORT_ASSETS,
    ...exports.CUSTOM_ASSETS,
];
exports.DEFAULT_LAYER_NAME = 'PRMSC Red Book Assets';
exports.READ_ROLES = [
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
];
exports.WRITE_ROLES = ['EDCS Consultant', 'EDCS User', 'Super Admin', 'Admin', 'Tehsil Manager'];
exports.MANAGE_ROLES = ['Super Admin', 'Admin', 'Tehsil Manager'];
exports.MAINTENANCE_ROLES = ['Super Admin', 'Admin', 'Tehsil Manager'];
exports.CONSULTANT_CREATOR_ROLES = ['EDCS Consultant', 'EDCS User'];
exports.PLAN_ALLOWED_MIME_TYPES = new Set([
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
exports.UPLOAD_SUBDIR = 'documents';
exports.MAX_UPLOAD_FILE_SIZE = 12 * 1024 * 1024;
exports.MAX_UPLOAD_FILES = 5;
//# sourceMappingURL=consultant-plans.constants.js.map