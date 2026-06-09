export declare const LAND_ACQUISITION_STATUSES: readonly ["Identification Pending", "Document Collection", "Verification Scheduled", "Verification Complete", "Submitted for Approval", "Approved", "Acquisition Complete", "Rejected"];
export declare const LAND_ACQUISITION_STATUS_SET: Set<string>;
export declare const BCC_LAND_STATUS_SET: Set<string>;
export declare const WORKFLOW_STATUSES: {
    readonly PENDING_DM: "Pending DM Review";
    readonly PENDING_BCC: "Pending BCC Officer Review";
    readonly PENDING_TM: "Pending TM Review";
    readonly PENDING_CHIEF: "Pending BCC Specialist Review";
    readonly PENDING_WB_DISPATCH: "Pending WB Dispatch";
    readonly PENDING_WB_APPROVAL: "Pending WB Approval";
    readonly WB_APPROVED: "WB Approved";
    readonly MARKED_TO_TM: "Marked to TM";
    readonly PENDING_BCC_CLOSURE: "Pending BCC Closure";
    readonly CLOSED: "Closed";
};
export declare const WORKFLOW_STATUS_LIST: ("Pending DM Review" | "Pending BCC Officer Review" | "Pending TM Review" | "Pending BCC Specialist Review" | "Pending WB Dispatch" | "Pending WB Approval" | "WB Approved" | "Marked to TM" | "Pending BCC Closure" | "Closed")[];
export declare const WORKFLOW_ASSIGNMENT_ROLES: Record<string, string[]>;
export declare const REQUISITION_UPLOAD_DIR = "uploads";
