"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_UPLOAD_FILES = exports.MAX_UPLOAD_BYTES = exports.ALLOWED_UPLOAD_TYPES = exports.MANAGER_ROLES = exports.PCRWR_ROLES = exports.PCRWR_LAB_ROLES = exports.PCRWR_SAMPLER_ROLES = exports.RA_ROLES = exports.ROLE_LAB = exports.ROLE_SAMPLER = exports.ROLE_RA = void 0;
exports.ROLE_RA = 'RA Environment';
exports.ROLE_SAMPLER = 'PCRWR Sampler';
exports.ROLE_LAB = 'PCRWR Lab';
exports.RA_ROLES = new Set([exports.ROLE_RA]);
exports.PCRWR_SAMPLER_ROLES = new Set([exports.ROLE_SAMPLER]);
exports.PCRWR_LAB_ROLES = new Set([exports.ROLE_LAB]);
exports.PCRWR_ROLES = new Set([...exports.PCRWR_SAMPLER_ROLES, ...exports.PCRWR_LAB_ROLES]);
exports.MANAGER_ROLES = new Set(['Super Admin', 'Admin']);
exports.ALLOWED_UPLOAD_TYPES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'text/plain',
]);
exports.MAX_UPLOAD_BYTES = 16 * 1024 * 1024;
exports.MAX_UPLOAD_FILES = 5;
//# sourceMappingURL=water-quality.constants.js.map