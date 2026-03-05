export interface ConsultantPlanCriticalInfo {
	criticalFlag: boolean;
	criticalReason: string;
	criticalMarkedAt: string | null;
	criticalMarkedBy?: UserRef | null;
	criticalMarkedByName?: string;
	criticalAcknowledgedAt?: string | null;
	criticalAcknowledgedBy?: UserRef | null;
	criticalAcknowledgedByName?: string;
	latestQualityStatus?: {
		status: string;
		label: string;
		score: number | null;
		updatedAt: string | null;
	} | null;
}

export interface ConsultantPlan extends ConsultantPlanCriticalInfo {
	id: string;
	title: string;
	assetType: string;
	assetLabel: string;
	category: string;
	layerName: string;
	description: string;
	requisitionId: string | null;
	tehsil: string;
	district: string;
	feature: any;
	attributes: Record<string, unknown>;
	attachments: ConsultantPlanAttachment[];
	maintenanceOwnerRole: string;
	maintenanceOwner: UserRef | null;
	maintenanceOwnerName: string;
	maintenanceRecords: MaintenanceRecord[];
	createdBy: UserRef | null;
	updatedBy: UserRef | null;
	createdAt: string;
	updatedAt: string;
}

export interface ConsultantPlanAttachment {
	storedName: string;
	originalName: string;
	mimeType: string;
	size: number;
	url: string;
}

export interface MaintenanceRecord {
	id: string;
	performedAt: string;
	type: string;
	status: string;
	description: string;
	cost: number;
	notes: string;
	recordedBy: UserRef | null;
	recordedByName: string;
}

export interface UserRef {
	id: string;
	name: string;
	role: string;
}
