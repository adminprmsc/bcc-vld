export const LAND_ACQUISITION_STATUSES = [
  'Identification Pending',
  'Document Collection',
  'Verification Scheduled',
  'Verification Complete',
  'Submitted for Approval',
  'Approved',
  'Acquisition Complete',
  'Rejected',
] as const;

export const LAND_ACQUISITION_STATUS_SET = new Set(
  LAND_ACQUISITION_STATUSES.map((status) => status.toLowerCase()),
);

export const BCC_LAND_STATUS_SET = new Set([
  'assigned to bcc',
  'land acquisition updated',
  'donor data uploaded',
  'documentation added',
  ...LAND_ACQUISITION_STATUSES.map((status) => status.toLowerCase()),
]);

export const WORKFLOW_STATUSES = {
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
} as const;

export const WORKFLOW_STATUS_LIST = Object.values(WORKFLOW_STATUSES);

export const WORKFLOW_ASSIGNMENT_ROLES: Record<string, string[]> = {
  [WORKFLOW_STATUSES.PENDING_DM]: ['DM Tehsil', 'Tehsil DM'],
  [WORKFLOW_STATUSES.PENDING_BCC]: ['BCC Officer Tehsil', 'BCC Officer'],
  [WORKFLOW_STATUSES.PENDING_TM]: ['Tehsil Manager'],
  [WORKFLOW_STATUSES.PENDING_CHIEF]: ['BCC Specialist'],
  [WORKFLOW_STATUSES.PENDING_WB_DISPATCH]: ['BCC Officer Tehsil', 'BCC Officer'],
  [WORKFLOW_STATUSES.PENDING_WB_APPROVAL]: ['WB User'],
  [WORKFLOW_STATUSES.WB_APPROVED]: ['BCC Specialist'],
  [WORKFLOW_STATUSES.MARKED_TO_TM]: ['Tehsil Manager'],
  [WORKFLOW_STATUSES.PENDING_BCC_CLOSURE]: ['BCC Officer Tehsil', 'BCC Officer'],
  [WORKFLOW_STATUSES.CLOSED]: [],
};

export const REQUISITION_UPLOAD_DIR = 'uploads';
