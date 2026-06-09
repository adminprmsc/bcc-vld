-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "water_quality_sample_attachments_attachment_type" AS ENUM ('main', 'collection', 'lab_analysis');

-- CreateEnum
CREATE TYPE "water_quality_sample_status_history_code" AS ENUM ('critical_flagged', 'assignment', 'collection_started', 'collection_complete', 'in_lab', 'results_posted', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "consultant_plan_maintenance_records_type" AS ENUM ('preventive', 'corrective', 'emergency', 'inspection');

-- CreateEnum
CREATE TYPE "access_requests_role_requested" AS ENUM ('Super Admin', 'Admin', 'DM Tehsil', 'Infra Engineer', 'CID', 'BCC Specialist', 'BCC Officer Tehsil', 'Citizen', 'EDCS Consultant', 'EDCS User', 'RA Environment', 'PCRWR Sampler', 'PCRWR Lab');

-- CreateEnum
CREATE TYPE "consultant_plan_maintenance_records_status" AS ENUM ('completed', 'pending', 'cancelled');

-- CreateEnum
CREATE TYPE "users_role" AS ENUM ('Super Admin', 'Admin', 'DM Tehsil', 'Infra Engineer', 'CID', 'BCC Specialist', 'BCC Officer Tehsil', 'EDCS Consultant', 'EDCS User', 'RA Environment', 'PCRWR Sampler', 'PCRWR Lab', 'Tehsil Manager', 'WB User', 'Citizen');

-- CreateEnum
CREATE TYPE "water_quality_sample_status_history_tone" AS ENUM ('info', 'success', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "access_requests_status" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "support_requests_priority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "water_quality_samples_status" AS ENUM ('awaiting_assignment', 'awaiting_collection', 'collecting', 'in_lab', 'results_ready', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "support_requests_status" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "audit_logs_status" AS ENUM ('success', 'failure', 'warning');

-- CreateEnum
CREATE TYPE "requisitions_land_acquisition_type" AS ENUM ('Govt Land', 'Private Land');

-- CreateEnum
CREATE TYPE "requisitions_priority" AS ENUM ('Low', 'Medium', 'High');

-- CreateTable
CREATE TABLE "access_requests" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role_requested" "access_requests_role_requested" DEFAULT 'Citizen',
    "tehsil" TEXT,
    "message" TEXT,
    "status" "access_requests_status" DEFAULT 'Pending',
    "processed_by" BIGINT,
    "processed_at" TIMESTAMP(3),
    "processed_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "description" TEXT,
    "user_id" BIGINT,
    "user_name" TEXT,
    "user_email" TEXT,
    "user_role" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_method" TEXT,
    "request_path" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "metadata" JSONB,
    "status" "audit_logs_status" DEFAULT 'success',
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_plan_attachments" (
    "id" BIGSERIAL NOT NULL,
    "consultant_plan_id" BIGINT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "original_name" TEXT DEFAULT '',
    "mime_type" TEXT DEFAULT '',
    "size" BIGINT DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultant_plan_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_plan_maintenance_records" (
    "id" BIGSERIAL NOT NULL,
    "consultant_plan_id" BIGINT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL,
    "type" "consultant_plan_maintenance_records_type" DEFAULT 'preventive',
    "status" "consultant_plan_maintenance_records_status" DEFAULT 'completed',
    "description" TEXT,
    "cost" DECIMAL(65,30) DEFAULT 0.00,
    "notes" TEXT,
    "recorded_by" BIGINT,
    "recorded_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultant_plan_maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_plans" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "asset_label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "layer_name" TEXT DEFAULT 'PRMSC Red Book Assets',
    "description" TEXT,
    "requisition_id" BIGINT,
    "tehsil" TEXT DEFAULT '',
    "district" TEXT DEFAULT '',
    "feature_type" TEXT DEFAULT 'Feature',
    "feature_geometry" JSONB NOT NULL,
    "feature_properties" JSONB,
    "attributes" JSONB,
    "critical_flag" BOOLEAN DEFAULT false,
    "critical_reason" TEXT,
    "critical_marked_at" TIMESTAMP(3),
    "critical_marked_by" BIGINT,
    "critical_marked_by_name" TEXT,
    "critical_acknowledged_at" TIMESTAMP(3),
    "critical_acknowledged_by" BIGINT,
    "critical_acknowledged_by_name" TEXT,
    "latest_quality_status_status" TEXT DEFAULT 'normal',
    "latest_quality_status_score" DECIMAL(65,30),
    "latest_quality_status_label" TEXT DEFAULT 'Normal',
    "latest_quality_status_updated_at" TIMESTAMP(3),
    "maintenance_owner_role" TEXT DEFAULT 'Tehsil Manager',
    "maintenance_owner" BIGINT,
    "maintenance_owner_name" TEXT,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultant_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "id" BIGSERIAL NOT NULL,
    "counter_key" TEXT NOT NULL,
    "seq" BIGINT DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisition_activity_logs" (
    "id" BIGSERIAL NOT NULL,
    "requisition_id" BIGINT NOT NULL,
    "action" TEXT,
    "user_id" BIGINT,
    "timestamp" TIMESTAMP(3),
    "remarks" TEXT,
    "meta" JSONB,

    CONSTRAINT "requisition_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisition_civil_structures" (
    "id" BIGSERIAL NOT NULL,
    "requisition_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT DEFAULT 'Planned',
    "description" TEXT,
    "attributes" JSONB,
    "photos" JSONB,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requisition_civil_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisition_machinery" (
    "id" BIGSERIAL NOT NULL,
    "requisition_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT DEFAULT 'Idle',
    "capacity" TEXT,
    "manufacturer" TEXT,
    "attributes" JSONB,
    "photos" JSONB,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requisition_machinery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisition_progress_updates" (
    "id" BIGSERIAL NOT NULL,
    "requisition_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "progress_date" TIMESTAMP(3),
    "completion_percentage" INTEGER,
    "attachments" JSONB,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requisition_progress_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisitions" (
    "id" BIGSERIAL NOT NULL,
    "sequence_number" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "purpose" TEXT NOT NULL,
    "division" TEXT DEFAULT '',
    "district" TEXT DEFAULT '',
    "tehsil" TEXT NOT NULL,
    "requested_by" BIGINT NOT NULL,
    "assigned_to" BIGINT,
    "land_area" TEXT,
    "land_type" TEXT,
    "land_breadth" DECIMAL(65,30) DEFAULT 0.0000,
    "land_depth" DECIMAL(65,30) DEFAULT 0.0000,
    "calculated_area_sq_ft" DECIMAL(65,30) DEFAULT 0.0000,
    "calculated_area_marlas" DECIMAL(65,30) DEFAULT 0.0000,
    "calculated_area_kanals" DECIMAL(65,30) DEFAULT 0.0000,
    "location_address" TEXT,
    "location_lat" DECIMAL(65,30),
    "location_lng" DECIMAL(65,30),
    "map_marker_lat" DECIMAL(65,30),
    "map_marker_lng" DECIMAL(65,30),
    "map_viewport_center_lat" DECIMAL(65,30),
    "map_viewport_center_lng" DECIMAL(65,30),
    "map_viewport_zoom" INTEGER DEFAULT 0,
    "govt_land_checklist" JSONB,
    "private_land_checklist" JSONB,
    "map_features" JSONB,
    "land_acquisition_type" "requisitions_land_acquisition_type",
    "land_acquisition_status" TEXT DEFAULT '',
    "land_acquisition_data" JSONB,
    "land_acquisition_updated_by" BIGINT,
    "land_acquisition_updated_at" TIMESTAMP(3),
    "land_utilization_phase" TEXT,
    "land_utilization_summary" TEXT,
    "land_utilization_next_milestone" TEXT,
    "land_utilization_gallery" JSONB,
    "land_utilization_updated_by" BIGINT,
    "land_utilization_updated_at" TIMESTAMP(3),
    "required_date" TIMESTAMP(3),
    "priority" "requisitions_priority" DEFAULT 'Medium',
    "supporting_docs" JSONB,
    "status" TEXT DEFAULT 'Pending',
    "estimated_value" TEXT,
    "remarks" TEXT,
    "attachments" JSONB,
    "date_created" TIMESTAMP(3),
    "last_updated" TIMESTAMP(3),

    CONSTRAINT "requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_request_attachments" (
    "id" BIGSERIAL NOT NULL,
    "support_request_id" BIGINT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT,
    "size" BIGINT DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_request_updates" (
    "id" BIGSERIAL NOT NULL,
    "support_request_id" BIGINT NOT NULL,
    "actor_id" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_request_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_requests" (
    "id" BIGSERIAL NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "created_by" BIGINT NOT NULL,
    "requester_name" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "requester_role" TEXT,
    "category" TEXT NOT NULL,
    "priority" "support_requests_priority" DEFAULT 'medium',
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "support_requests_status" DEFAULT 'open',
    "resolution_notes" TEXT,
    "assigned_to" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "simple_id" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "users_role" NOT NULL,
    "gender" TEXT,
    "cnic" TEXT,
    "cnic_expiry" TEXT,
    "address" TEXT,
    "dob" TEXT,
    "phone" TEXT,
    "active_status" TEXT DEFAULT 'inactive',
    "push_token" TEXT,
    "push_platform" TEXT,
    "push_device_name" TEXT,
    "push_token_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_quality_sample_attachments" (
    "id" BIGSERIAL NOT NULL,
    "sample_id" BIGINT NOT NULL,
    "attachment_type" "water_quality_sample_attachments_attachment_type" NOT NULL,
    "stored_name" TEXT NOT NULL,
    "original_name" TEXT DEFAULT '',
    "mime_type" TEXT DEFAULT '',
    "size" BIGINT DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_quality_sample_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_quality_sample_status_history" (
    "id" BIGSERIAL NOT NULL,
    "sample_id" BIGINT NOT NULL,
    "code" "water_quality_sample_status_history_code" NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "tone" "water_quality_sample_status_history_tone" DEFAULT 'info',
    "created_by" BIGINT NOT NULL,
    "created_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_quality_sample_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_quality_samples" (
    "id" BIGSERIAL NOT NULL,
    "plan_id" BIGINT NOT NULL,
    "plan_snapshot_plan_id" BIGINT NOT NULL,
    "plan_snapshot_title" TEXT DEFAULT '',
    "plan_snapshot_category" TEXT DEFAULT '',
    "plan_snapshot_tehsil" TEXT DEFAULT '',
    "plan_snapshot_district" TEXT DEFAULT '',
    "status" "water_quality_samples_status" DEFAULT 'awaiting_assignment',
    "assigned_sampler" BIGINT,
    "assigned_sampler_name" TEXT,
    "assigned_at" TIMESTAMP(3),
    "collection_collected_at" TIMESTAMP(3),
    "collection_field_notes" TEXT,
    "collection_location_lat" DECIMAL(65,30),
    "collection_location_lng" DECIMAL(65,30),
    "collection_collected_by" BIGINT,
    "collection_collected_by_name" TEXT,
    "lab_analysis_received_at" TIMESTAMP(3),
    "lab_analysis_completed_at" TIMESTAMP(3),
    "lab_analysis_analyst" BIGINT,
    "lab_analysis_analyst_name" TEXT,
    "lab_analysis_metrics" JSONB,
    "lab_analysis_notes" TEXT,
    "computed_score_index_name" TEXT DEFAULT 'potability-index',
    "computed_score_value" DECIMAL(65,30),
    "computed_score_rating" TEXT DEFAULT 'pending',
    "computed_score_updated_at" TIMESTAMP(3),
    "created_by" BIGINT NOT NULL,
    "created_by_name" TEXT,
    "updated_by" BIGINT,
    "updated_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_quality_samples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_requests_created_at_idx" ON "access_requests"("created_at");

-- CreateIndex
CREATE INDEX "access_requests_email_idx" ON "access_requests"("email");

-- CreateIndex
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");

-- CreateIndex
CREATE INDEX "access_requests_processed_by_idx" ON "access_requests"("processed_by");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_status_idx" ON "audit_logs"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "consultant_plan_attachments_consultant_plan_id_idx" ON "consultant_plan_attachments"("consultant_plan_id");

-- CreateIndex
CREATE INDEX "consultant_plan_maintenance_records_consultant_plan_id_idx" ON "consultant_plan_maintenance_records"("consultant_plan_id");

-- CreateIndex
CREATE INDEX "consultant_plan_maintenance_records_performed_at_idx" ON "consultant_plan_maintenance_records"("performed_at");

-- CreateIndex
CREATE INDEX "consultant_plan_maintenance_records_recorded_by_idx" ON "consultant_plan_maintenance_records"("recorded_by");

-- CreateIndex
CREATE INDEX "consultant_plans_category_idx" ON "consultant_plans"("category");

-- CreateIndex
CREATE INDEX "consultant_plans_created_at_idx" ON "consultant_plans"("created_at");

-- CreateIndex
CREATE INDEX "consultant_plans_critical_flag_idx" ON "consultant_plans"("critical_flag");

-- CreateIndex
CREATE INDEX "consultant_plans_district_idx" ON "consultant_plans"("district");

-- CreateIndex
CREATE INDEX "consultant_plans_tehsil_idx" ON "consultant_plans"("tehsil");

-- CreateIndex
CREATE INDEX "consultant_plans_created_by_idx" ON "consultant_plans"("created_by");

-- CreateIndex
CREATE INDEX "consultant_plans_requisition_id_idx" ON "consultant_plans"("requisition_id");

-- CreateIndex
CREATE INDEX "consultant_plans_updated_by_idx" ON "consultant_plans"("updated_by");

-- CreateIndex
CREATE UNIQUE INDEX "counters_counter_key_key" ON "counters"("counter_key");

-- CreateIndex
CREATE INDEX "requisition_activity_logs_requisition_id_idx" ON "requisition_activity_logs"("requisition_id");

-- CreateIndex
CREATE INDEX "requisition_activity_logs_timestamp_idx" ON "requisition_activity_logs"("timestamp");

-- CreateIndex
CREATE INDEX "requisition_activity_logs_user_id_idx" ON "requisition_activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "requisition_civil_structures_requisition_id_idx" ON "requisition_civil_structures"("requisition_id");

-- CreateIndex
CREATE INDEX "requisition_civil_structures_updated_by_idx" ON "requisition_civil_structures"("updated_by");

-- CreateIndex
CREATE INDEX "requisition_machinery_requisition_id_idx" ON "requisition_machinery"("requisition_id");

-- CreateIndex
CREATE INDEX "requisition_machinery_updated_by_idx" ON "requisition_machinery"("updated_by");

-- CreateIndex
CREATE INDEX "requisition_progress_updates_progress_date_idx" ON "requisition_progress_updates"("progress_date");

-- CreateIndex
CREATE INDEX "requisition_progress_updates_requisition_id_idx" ON "requisition_progress_updates"("requisition_id");

-- CreateIndex
CREATE INDEX "requisition_progress_updates_updated_by_idx" ON "requisition_progress_updates"("updated_by");

-- CreateIndex
CREATE UNIQUE INDEX "requisitions_sequence_number_key" ON "requisitions"("sequence_number");

-- CreateIndex
CREATE INDEX "requisitions_assigned_to_idx" ON "requisitions"("assigned_to");

-- CreateIndex
CREATE INDEX "requisitions_date_created_idx" ON "requisitions"("date_created");

-- CreateIndex
CREATE INDEX "requisitions_district_idx" ON "requisitions"("district");

-- CreateIndex
CREATE INDEX "requisitions_requested_by_idx" ON "requisitions"("requested_by");

-- CreateIndex
CREATE INDEX "requisitions_status_idx" ON "requisitions"("status");

-- CreateIndex
CREATE INDEX "requisitions_tehsil_idx" ON "requisitions"("tehsil");

-- CreateIndex
CREATE INDEX "support_request_attachments_support_request_id_idx" ON "support_request_attachments"("support_request_id");

-- CreateIndex
CREATE INDEX "support_request_updates_actor_id_idx" ON "support_request_updates"("actor_id");

-- CreateIndex
CREATE INDEX "support_request_updates_created_at_idx" ON "support_request_updates"("created_at");

-- CreateIndex
CREATE INDEX "support_request_updates_support_request_id_idx" ON "support_request_updates"("support_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_requests_ticket_number_key" ON "support_requests"("ticket_number");

-- CreateIndex
CREATE INDEX "support_requests_assigned_to_idx" ON "support_requests"("assigned_to");

-- CreateIndex
CREATE INDEX "support_requests_created_at_idx" ON "support_requests"("created_at");

-- CreateIndex
CREATE INDEX "support_requests_created_by_idx" ON "support_requests"("created_by");

-- CreateIndex
CREATE INDEX "support_requests_priority_idx" ON "support_requests"("priority");

-- CreateIndex
CREATE INDEX "support_requests_status_idx" ON "support_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_simple_id_key" ON "users"("simple_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_active_status_idx" ON "users"("active_status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "water_quality_sample_attachments_attachment_type_idx" ON "water_quality_sample_attachments"("attachment_type");

-- CreateIndex
CREATE INDEX "water_quality_sample_attachments_sample_id_idx" ON "water_quality_sample_attachments"("sample_id");

-- CreateIndex
CREATE INDEX "water_quality_sample_status_history_created_by_idx" ON "water_quality_sample_status_history"("created_by");

-- CreateIndex
CREATE INDEX "water_quality_sample_status_history_created_at_idx" ON "water_quality_sample_status_history"("created_at");

-- CreateIndex
CREATE INDEX "water_quality_sample_status_history_sample_id_idx" ON "water_quality_sample_status_history"("sample_id");

-- CreateIndex
CREATE INDEX "water_quality_samples_assigned_sampler_idx" ON "water_quality_samples"("assigned_sampler");

-- CreateIndex
CREATE INDEX "water_quality_samples_created_by_idx" ON "water_quality_samples"("created_by");

-- CreateIndex
CREATE INDEX "water_quality_samples_lab_analysis_analyst_idx" ON "water_quality_samples"("lab_analysis_analyst");

-- CreateIndex
CREATE INDEX "water_quality_samples_created_at_idx" ON "water_quality_samples"("created_at");

-- CreateIndex
CREATE INDEX "water_quality_samples_plan_id_idx" ON "water_quality_samples"("plan_id");

-- CreateIndex
CREATE INDEX "water_quality_samples_plan_snapshot_tehsil_status_idx" ON "water_quality_samples"("plan_snapshot_tehsil", "status");

-- CreateIndex
CREATE INDEX "water_quality_samples_status_idx" ON "water_quality_samples"("status");

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_plan_attachments" ADD CONSTRAINT "consultant_plan_attachments_consultant_plan_id_fkey" FOREIGN KEY ("consultant_plan_id") REFERENCES "consultant_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_plan_maintenance_records" ADD CONSTRAINT "consultant_plan_maintenance_records_consultant_plan_id_fkey" FOREIGN KEY ("consultant_plan_id") REFERENCES "consultant_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_plan_maintenance_records" ADD CONSTRAINT "consultant_plan_maintenance_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_plans" ADD CONSTRAINT "consultant_plans_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_plans" ADD CONSTRAINT "consultant_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_plans" ADD CONSTRAINT "consultant_plans_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_activity_logs" ADD CONSTRAINT "requisition_activity_logs_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_activity_logs" ADD CONSTRAINT "requisition_activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_civil_structures" ADD CONSTRAINT "requisition_civil_structures_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_civil_structures" ADD CONSTRAINT "requisition_civil_structures_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_machinery" ADD CONSTRAINT "requisition_machinery_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_machinery" ADD CONSTRAINT "requisition_machinery_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_progress_updates" ADD CONSTRAINT "requisition_progress_updates_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_progress_updates" ADD CONSTRAINT "requisition_progress_updates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_request_attachments" ADD CONSTRAINT "support_request_attachments_support_request_id_fkey" FOREIGN KEY ("support_request_id") REFERENCES "support_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_request_updates" ADD CONSTRAINT "support_request_updates_support_request_id_fkey" FOREIGN KEY ("support_request_id") REFERENCES "support_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_request_updates" ADD CONSTRAINT "support_request_updates_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_quality_sample_attachments" ADD CONSTRAINT "water_quality_sample_attachments_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "water_quality_samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_quality_sample_status_history" ADD CONSTRAINT "water_quality_sample_status_history_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "water_quality_samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_quality_sample_status_history" ADD CONSTRAINT "water_quality_sample_status_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_quality_samples" ADD CONSTRAINT "water_quality_samples_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "consultant_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_quality_samples" ADD CONSTRAINT "water_quality_samples_assigned_sampler_fkey" FOREIGN KEY ("assigned_sampler") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_quality_samples" ADD CONSTRAINT "water_quality_samples_lab_analysis_analyst_fkey" FOREIGN KEY ("lab_analysis_analyst") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_quality_samples" ADD CONSTRAINT "water_quality_samples_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
