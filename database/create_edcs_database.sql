-- Create Database for EDCS System
CREATE DATABASE edcs_system;
\c edcs_system;

-- 1. Cases/Requests Table (Main workflow tracking)
CREATE TABLE cases (
    case_id SERIAL PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    edcs_user_id INT REFERENCES users(id) ON DELETE CASCADE,
    land_type VARCHAR(50) CHECK (land_type IN ('State Land', 'Voluntary Land Donation')),
    current_stage VARCHAR(50) DEFAULT 'EDCS' CHECK (current_stage IN ('EDCS', 'DM', 'BCC_OFFICER', 'TM', 'BCC_SPECIALIST', 'COMPLETED', 'REJECTED')),
    assigned_to_dm INT REFERENCES users(id),
    assigned_to_bcc_officer INT REFERENCES users(id),
    assigned_to_tm INT REFERENCES users(id),
    assigned_to_bcc_specialist INT REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. EDCS User Details (Enhanced)
CREATE TABLE edcs_user_details (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(case_id) ON DELETE CASCADE,
    consultant_name VARCHAR(255) NOT NULL,
    region VARCHAR(100) NOT NULL,
    form_filling_date DATE NOT NULL,
    village_name VARCHAR(255) NOT NULL,
    settlement_name VARCHAR(255) NOT NULL,
    scheme_interventions TEXT NOT NULL,
    land_proposed_for VARCHAR(255) NOT NULL,
    area_required_marla DECIMAL(10,2) NOT NULL,
    options_identified INT NOT NULL,
    land_type_selected VARCHAR(50) CHECK (land_type_selected IN ('State Land', 'Voluntary Land Donation')),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. State Land Forms
CREATE TABLE state_land_forms (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(case_id) ON DELETE CASCADE,
    
    -- Basic Information
    option_number INT,
    state_land_available VARCHAR(10),
    community_land_available VARCHAR(10),
    land_type VARCHAR(100),
    category_jointly_recognized VARCHAR(10),
    land_area DECIMAL(10,2),
    
    -- Donor Information (for mixed forms)
    donor_name VARCHAR(255),
    donor_cnic VARCHAR(15),
    
    -- Land Details
    land_status VARCHAR(50),
    land_use VARCHAR(100),
    land_tenure VARCHAR(50),
    land_ownership VARCHAR(50),
    land_value_pkr DECIMAL(15,2),
    
    -- Ownership/Allotment Details
    ownership_allotment_name VARCHAR(255),
    department_title VARCHAR(255),
    
    -- Legal Status
    legal_encumbrance VARCHAR(10),
    social_legal_dispute VARCHAR(10),
    mutation_possible VARCHAR(10),
    department_noc_willing VARCHAR(10),
    revenue_dept_allows VARCHAR(10),
    
    -- Financial Details
    structure_assets_cost DECIMAL(15,2),
    livelihood_impact VARCHAR(10),
    relocation_involved VARCHAR(10),
    dc_value DECIMAL(15,2),
    market_value DECIMAL(15,2),
    
    -- Consultation and Consent
    consultation_meeting_conducted VARCHAR(10),
    vo_consent VARCHAR(10),
    neighbors_consent VARCHAR(10),
    grm_process_explained VARCHAR(10),
    
    -- Viability and Compliance
    land_viable VARCHAR(10),
    provisions_relaxation_needed VARCHAR(10),
    relaxation_numbers TEXT,
    rationale_for_relaxation TEXT,
    implications_of_relaxation TEXT,
    mitigation_of_implications TEXT,
    
    -- File uploads
    pdf_file VARCHAR(255),
    land_title_document VARCHAR(255),
    ownership_document VARCHAR(255),
    fard_malkiyat_file VARCHAR(255),
    noc_requisition_file VARCHAR(255),
    revenue_requisition_file VARCHAR(255),
    vo_consent_file VARCHAR(255),
    neighbors_consent_file VARCHAR(255),
    relevant_proofs_file VARCHAR(255),
    
    -- Status and timestamps
    is_draft BOOLEAN DEFAULT TRUE,
    submitted_at TIMESTAMP,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. VLD Checklist Forms
DROP TABLE IF EXISTS vld_checklist_forms CASCADE;

CREATE TABLE vld_checklist_forms (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(case_id) ON DELETE CASCADE,
    
    -- Basic Information
    option_number INT,
    state_land_available VARCHAR(10),
    community_land_available VARCHAR(10),
    
    -- VLD Justification
    vld_reasons TEXT,
    comparative_analysis TEXT,
    cost_analysis TEXT,
    
    -- Donor Vulnerability Assessment
    donor_vulnerable_group VARCHAR(10),
    donor_poverty_line VARCHAR(10),
    female_head_household VARCHAR(10),
    
    -- Land Details
    land_type VARCHAR(100),
    category_jointly_recognized VARCHAR(10),
    land_area_donated DECIMAL(10,2),
    
    -- Donor Information
    donor_name VARCHAR(255),
    donor_gender VARCHAR(10),
    landholding_title VARCHAR(255),
    
    -- Legal Status
    land_on_donor_name VARCHAR(10),
    land_pledged VARCHAR(10),
    legal_encumbrance VARCHAR(10),
    social_legal_dispute VARCHAR(10),
    mutation_possible VARCHAR(10),
    donor_willing_mutation VARCHAR(10),
    
    -- Lease Information
    land_leased VARCHAR(10),
    lessor_impact_cost DECIMAL(15,2),
    
    -- Land Holdings
    total_landholding DECIMAL(10,2),
    structure_assets_cost DECIMAL(15,2),
    holdings_more_2_kanal VARCHAR(10),
    holdings_more_25_kanal VARCHAR(10),
    
    -- Impact Assessment
    livelihood_impact VARCHAR(10),
    relocation_involved VARCHAR(10),
    donation_percentage DECIMAL(5,2),
    
    -- Financial Valuation
    dc_value DECIMAL(15,2),
    market_value DECIMAL(15,2),
    
    -- Consultation and Consent
    consultation_meeting_conducted VARCHAR(10),
    vo_consent VARCHAR(10),
    neighbors_consent VARCHAR(10),
    grm_process_explained VARCHAR(10),
    
    -- Donor Understanding
    donor_knows_no_rights VARCHAR(10),
    donor_knows_equal_access VARCHAR(10),
    donor_willing_pay_taxes VARCHAR(10),
    
    -- Viability and Compliance
    land_viable VARCHAR(10),
    provisions_relaxation_needed VARCHAR(10),
    relaxation_numbers TEXT,
    rationale_for_relaxation TEXT,
    implications_of_relaxation TEXT,
    mitigation_of_implications TEXT,
    
    -- File uploads
    fard_malkiyat_file VARCHAR(255),
    affidavit_file VARCHAR(255),
    total_donations_fard_file VARCHAR(255),
    vo_consent_file VARCHAR(255),
    neighbors_consent_file VARCHAR(255),
    relevant_proofs_file VARCHAR(255),
    
    -- Status and timestamps
    is_draft BOOLEAN DEFAULT TRUE,
    submitted_at TIMESTAMP,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Workflow Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(case_id) ON DELETE CASCADE,
    recipient_id INT REFERENCES users(id),
    sender_id INT REFERENCES users(id),
    message TEXT NOT NULL,
    notification_type VARCHAR(50) CHECK (notification_type IN ('NEW_CASE', 'FORWARDED', 'RETURNED', 'COMPLETED')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Case History/Audit Trail
CREATE TABLE case_history (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(case_id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by INT REFERENCES users(id),
    from_stage VARCHAR(50),
    to_stage VARCHAR(50),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Returned Forms
CREATE TABLE returned_forms (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(case_id) ON DELETE CASCADE,
    returned_by INT REFERENCES users(id),
    returned_to INT REFERENCES users(id),
    reason TEXT NOT NULL,
    stage_returned_from VARCHAR(50),
    returned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Completed Requests
CREATE TABLE completed_requests (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(case_id) ON DELETE CASCADE,
    completed_by INT REFERENCES users(id),
    completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    final_status VARCHAR(50) CHECK (final_status IN ('APPROVED', 'REJECTED')),
    remarks TEXT
);

-- 9. Follow-ups & Queries
CREATE TABLE followups (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(case_id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    response_text TEXT,
    raised_by INT REFERENCES users(id),
    responded_by INT REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Donor History
CREATE TABLE donor_history (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(case_id),
    donor_name VARCHAR(255) NOT NULL,
    donor_cnic VARCHAR(15),
    donation_type VARCHAR(100) CHECK (donation_type IN ('Land', 'Cash', 'Equipment', 'Other')),
    donation_amount DECIMAL(12,2),
    land_details TEXT,
    donated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT
);

-- 11. Verification Summary
CREATE TABLE verification_summary (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(case_id) ON DELETE CASCADE,
    verified_by INT REFERENCES users(id),
    verification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_status VARCHAR(50) CHECK (verification_status IN ('Verified', 'Pending', 'Rejected', 'Requires Review')),
    summary TEXT NOT NULL,
    stage VARCHAR(50) -- Which stage this verification was done at
);

-- DM Checklist Responses Table
CREATE TABLE dm_checklist (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(case_id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    edcs_response TEXT,
    dm_response VARCHAR(50),
    dm_remarks TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes
CREATE INDEX idx_cases_edcs_user ON cases(edcs_user_id);
CREATE INDEX idx_cases_stage ON cases(current_stage);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read);
CREATE INDEX idx_case_history_case ON case_history(case_id);



