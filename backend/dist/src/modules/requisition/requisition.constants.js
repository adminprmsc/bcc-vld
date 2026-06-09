"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUISITION_UPLOAD_DIR = exports.WORKFLOW_ASSIGNMENT_ROLES = exports.WORKFLOW_STATUS_LIST = exports.WORKFLOW_STATUSES = exports.BCC_LAND_STATUS_SET = exports.LAND_ACQUISITION_STATUS_SET = exports.LAND_ACQUISITION_STATUSES = void 0;
exports.LAND_ACQUISITION_STATUSES = [
    'Identification Pending',
    'Document Collection',
    'Verification Scheduled',
    'Verification Complete',
    'Submitted for Approval',
    'Approved',
    'Acquisition Complete',
    'Rejected',
];
exports.LAND_ACQUISITION_STATUS_SET = new Set(exports.LAND_ACQUISITION_STATUSES.map((status) => status.toLowerCase()));
exports.BCC_LAND_STATUS_SET = new Set([
    'assigned to bcc',
    'land acquisition updated',
    'donor data uploaded',
    'documentation added',
    ...exports.LAND_ACQUISITION_STATUSES.map((status) => status.toLowerCase()),
]);
exports.WORKFLOW_STATUSES = {
    PENDING_DM: 'Pending DM Review',
    PENDING_BCC: 'Pending BCC Officer Review',
    PENDING_TM: 'Pending TM Review',
    PENDING_CHIEF: 'Pending BCC Specialist Review',
    PENDING_WB_DISPATCH: 'Pending WB Dispatch',
    PENDING_WB_APPROVAL: 'Pending WB Approval',
    WB_APPROVED: 'WB Approved',
    MARKED_TO_TM: 'Marked to TM',
    PENDING_BCC_CLOSURE: 'Pending BCC Closure',
    CLOSED: 'Closed',
};
exports.WORKFLOW_STATUS_LIST = Object.values(exports.WORKFLOW_STATUSES);
exports.WORKFLOW_ASSIGNMENT_ROLES = {
    [exports.WORKFLOW_STATUSES.PENDING_DM]: ['DM Tehsil', 'Tehsil DM'],
    [exports.WORKFLOW_STATUSES.PENDING_BCC]: ['BCC Officer Tehsil', 'BCC Officer'],
    [exports.WORKFLOW_STATUSES.PENDING_TM]: ['Tehsil Manager'],
    [exports.WORKFLOW_STATUSES.PENDING_CHIEF]: ['BCC Specialist'],
    [exports.WORKFLOW_STATUSES.PENDING_WB_DISPATCH]: ['BCC Officer Tehsil', 'BCC Officer'],
    [exports.WORKFLOW_STATUSES.PENDING_WB_APPROVAL]: ['WB User'],
    [exports.WORKFLOW_STATUSES.WB_APPROVED]: ['BCC Specialist'],
    [exports.WORKFLOW_STATUSES.MARKED_TO_TM]: ['Tehsil Manager'],
    [exports.WORKFLOW_STATUSES.PENDING_BCC_CLOSURE]: ['BCC Officer Tehsil', 'BCC Officer'],
    [exports.WORKFLOW_STATUSES.CLOSED]: [],
};
exports.REQUISITION_UPLOAD_DIR = 'uploads';
//# sourceMappingURL=requisition.constants.js.map