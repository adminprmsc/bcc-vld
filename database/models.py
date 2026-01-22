from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Numeric
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=False)
    birth_date = db.Column(db.Date, nullable=False)
    gender = db.Column(db.Enum('Male', 'Female', 'Other', name='gender_enum'), nullable=False)
    region = db.Column(db.String(100), nullable=False)
    district = db.Column(db.String(100), nullable=False)
    tehsil = db.Column(db.String(100), nullable=False)
    village = db.Column(db.String(100), nullable=True)
    village_code = db.Column(db.String(20), nullable=True)
    village_latitude = db.Column(db.Float, nullable=True)
    village_longitude = db.Column(db.Float, nullable=True)
    address_line1 = db.Column(db.String(255), nullable=False)
    postal_code = db.Column(db.String(10), nullable=False)
    designation = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('EDCS', 'DM', 'BCCO', 'TM', 'BCCSP', 'admin', name='role_enum'), default='EDCS')
    
    # Optional fields
    address_line2 = db.Column(db.String(255), nullable=True)
    employee_id = db.Column(db.String(50), nullable=True)
    supervisor = db.Column(db.String(255), nullable=True)
    cnic = db.Column(db.String(15), nullable=True)
    official_email = db.Column(db.String(255), nullable=True)
    profile_picture = db.Column(db.String(255), nullable=True)
    
    # Authentication fields
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    email_verified = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def update_last_login(self):
        self.last_login = datetime.utcnow()
        db.session.commit()

class LoginAttempt(db.Model):
    __tablename__ = 'login_attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    success = db.Column(db.Boolean, default=False)
    attempted_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_agent = db.Column(db.Text, nullable=True)

class UserSession(db.Model):
    __tablename__ = 'user_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_token = db.Column(db.String(255), unique=True, nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationship
    user = db.relationship('User', backref='sessions')

class EDCSStateLandOption(db.Model):
    __tablename__ = 'edcs_state_land_options'
    
    id = db.Column(db.Integer, primary_key=True)
    details_id = db.Column(db.Integer, db.ForeignKey('edcs_user_details.id'), nullable=False)
    option_number = db.Column(db.Integer, nullable=False)
    state_land_available = db.Column(db.String(10), nullable=True)
    community_land_available = db.Column(db.String(10), nullable=True)
    land_type = db.Column(db.String(100), nullable=True)
    category_jointly_recognized = db.Column(db.String(100), nullable=True)
    land_area = db.Column(Numeric(10,2), nullable=True)
    ownership_allotment_name = db.Column(db.String(255), nullable=True)
    department_title = db.Column(db.String(255), nullable=True)
    legal_encumbrance = db.Column(db.String(10), nullable=True)
    social_legal_dispute = db.Column(db.String(10), nullable=True)
    mutation_allotment_possible = db.Column(db.String(10), nullable=True)
    noc_willing_department = db.Column(db.String(10), nullable=True)
    revenue_dept_allows_use = db.Column(db.String(10), nullable=True)
    assets_value_on_land = db.Column(Numeric(12,2), default=0)
    livelihood_impact = db.Column(db.String(10), nullable=True)
    relocation_involved = db.Column(db.String(10), nullable=True)
    dc_value = db.Column(Numeric(12,2), default=0)
    market_value = db.Column(Numeric(12,2), default=0)
    consultation_meeting = db.Column(db.String(10), nullable=True)
    vo_consent = db.Column(db.String(10), nullable=True)
    neighborers_consent = db.Column(db.String(10), nullable=True)
    grm_process_explained = db.Column(db.String(10), nullable=True)
    land_viable = db.Column(db.String(10), nullable=True)
    provisions_relaxation_needed = db.Column(db.String(10), nullable=True)
    relaxation_numbers = db.Column(db.Text, nullable=True)
    rationale_for_relaxation = db.Column(db.Text, nullable=True)
    implications_of_relaxation = db.Column(db.Text, nullable=True)
    mitigation_of_implications = db.Column(db.Text, nullable=True)
    fard_malkiyat_file = db.Column(db.String(255), nullable=True)
    submitted_by = db.Column(db.String(255), nullable=True)
    is_draft = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    edcs_details = db.relationship('EDCSUserDetails', backref='state_land_options')
    creator = db.relationship('User', backref='created_state_land_options')

class Case(db.Model):
    __tablename__ = 'cases'
    
    case_id = db.Column(db.Integer, primary_key=True)
    case_number = db.Column(db.String(50), unique=True, nullable=False)
    edcs_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    land_type = db.Column(db.String(50), nullable=True)
    current_stage = db.Column(db.String(50), default='EDCS')
    assigned_to_dm = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    assigned_to_bcc_officer = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    assigned_to_tm = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    assigned_to_bcc_specialist = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    status = db.Column(db.String(50), default='draft')
    reviewing_by_dm = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewing_by_bcc = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewing_by_tm = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewing_by_bcc_specialist = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    edcs_user = db.relationship('User', foreign_keys=[edcs_user_id], backref='created_cases')
    dm_user = db.relationship('User', foreign_keys=[assigned_to_dm], backref='dm_cases')
    bcc_officer = db.relationship('User', foreign_keys=[assigned_to_bcc_officer], backref='bcc_officer_cases')
    tm_user = db.relationship('User', foreign_keys=[assigned_to_tm], backref='tm_cases')
    bcc_specialist = db.relationship('User', foreign_keys=[assigned_to_bcc_specialist], backref='bcc_specialist_cases')

class EDCSUserDetails(db.Model):
    __tablename__ = 'edcs_user_details'

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=True)  # Made nullable - case created later
    consultant_name = db.Column(db.String(255), nullable=False)
    region = db.Column(db.String(100), nullable=False)
    form_filling_date = db.Column(db.Date, nullable=False)
    village_name = db.Column(db.String(255), nullable=False)
    settlement_name = db.Column(db.String(255), nullable=False)
    scheme_interventions = db.Column(db.Text, nullable=False)
    land_proposed_for = db.Column(db.String(255), nullable=False)
    area_required_marla = db.Column(Numeric(10,2), nullable=False)
    options_identified = db.Column(db.Integer, nullable=False)
    land_type_selected = db.Column(db.String(50), nullable=True)
    is_draft = db.Column(db.Boolean, default=True)  # Track if this is a draft
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    case = db.relationship('Case', backref='edcs_details')
    creator = db.relationship('User', backref='edcs_user_details')

class StateLandForm(db.Model):
    __tablename__ = 'state_land_forms'
    
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    
    # Basic Information
    option_number = db.Column(db.Integer, nullable=False)
    state_land_available = db.Column(db.String(10), nullable=True)
    community_land_available = db.Column(db.String(10), nullable=True)
    land_type = db.Column(db.String(100), nullable=True)
    category_jointly_recognized = db.Column(db.String(10), nullable=True)
    land_area = db.Column(db.Numeric(10,2), nullable=True)
    
    # Donor Information (for mixed forms)
    donor_name = db.Column(db.String(255), nullable=True)
    donor_cnic = db.Column(db.String(15), nullable=True)
    
    # Land Details
    land_status = db.Column(db.String(50), nullable=True)
    land_use = db.Column(db.String(100), nullable=True)
    land_tenure = db.Column(db.String(50), nullable=True)
    land_ownership = db.Column(db.String(50), nullable=True)
    land_value_pkr = db.Column(db.Numeric(15,2), nullable=True)
    
    # Ownership/Allotment Details
    ownership_allotment_name = db.Column(db.String(255), nullable=True)
    department_title = db.Column(db.String(255), nullable=True)
    
    # Legal Status
    legal_encumbrance = db.Column(db.String(10), nullable=True)
    social_legal_dispute = db.Column(db.String(10), nullable=True)
    mutation_possible = db.Column(db.String(10), nullable=True)
    department_noc_willing = db.Column(db.String(10), nullable=True)
    revenue_dept_allows = db.Column(db.String(10), nullable=True)
    
    # Financial Details
    structure_assets_cost = db.Column(db.Numeric(15,2), nullable=True)
    livelihood_impact = db.Column(db.String(10), nullable=True)
    relocation_involved = db.Column(db.String(10), nullable=True)
    dc_value = db.Column(db.Numeric(15,2), nullable=True)
    market_value = db.Column(db.Numeric(15,2), nullable=True)
    
    # Consultation and Consent
    consultation_meeting_conducted = db.Column(db.String(10), nullable=True)
    vo_consent = db.Column(db.String(10), nullable=True)
    neighbors_consent = db.Column(db.String(10), nullable=True)
    grm_process_explained = db.Column(db.String(10), nullable=True)
    
    # Viability and Compliance
    land_viable = db.Column(db.String(10), nullable=True)
    provisions_relaxation_needed = db.Column(db.String(10), nullable=True)
    relaxation_numbers = db.Column(db.Text, nullable=True)
    rationale_for_relaxation = db.Column(db.Text, nullable=True)
    implications_of_relaxation = db.Column(db.Text, nullable=True)
    mitigation_of_implications = db.Column(db.Text, nullable=True)
    
    # File uploads (store file paths)
    pdf_file = db.Column(db.String(255), nullable=True)
    land_title_document = db.Column(db.String(255), nullable=True)
    ownership_document = db.Column(db.String(255), nullable=True)
    fard_malkiyat_file = db.Column(db.String(255), nullable=True)
    noc_requisition_file = db.Column(db.String(255), nullable=True)
    revenue_requisition_file = db.Column(db.String(255), nullable=True)
    vo_consent_file = db.Column(db.String(255), nullable=True)
    neighbors_consent_file = db.Column(db.String(255), nullable=True)
    relevant_proofs_file = db.Column(db.String(255), nullable=True)
    
    # Status and timestamps
    is_draft = db.Column(db.Boolean, default=True)
    submitted_at = db.Column(db.DateTime, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    case = db.relationship('Case', backref='state_land_forms')
    creator = db.relationship('User', backref='created_state_land_forms')

class VLDChecklistForm(db.Model):
    __tablename__ = 'vld_checklist_forms'
    
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    
    # Basic Information
    option_number = db.Column(db.Integer, nullable=False)
    state_land_available = db.Column(db.String(10), nullable=True)
    community_land_available = db.Column(db.String(10), nullable=True)
    
    # VLD Justification
    vld_reasons = db.Column(db.Text, nullable=True)
    comparative_analysis = db.Column(db.Text, nullable=True)
    cost_analysis = db.Column(db.Text, nullable=True)
    
    # Donor Vulnerability Assessment
    donor_vulnerable_group = db.Column(db.String(10), nullable=True)
    donor_poverty_line = db.Column(db.String(10), nullable=True)
    female_head_household = db.Column(db.String(10), nullable=True)
    
    # Land Details
    land_type = db.Column(db.String(100), nullable=True)
    category_jointly_recognized = db.Column(db.String(10), nullable=True)
    land_area_donated = db.Column(db.Numeric(10,2), nullable=True)
    
    # Donor Information
    donor_name = db.Column(db.String(255), nullable=False)
    donor_gender = db.Column(db.String(10), nullable=True)
    landholding_title = db.Column(db.String(255), nullable=True)
    
    # Legal Status
    land_on_donor_name = db.Column(db.String(10), nullable=True)
    land_pledged = db.Column(db.String(10), nullable=True)
    legal_encumbrance = db.Column(db.String(10), nullable=True)
    social_legal_dispute = db.Column(db.String(10), nullable=True)
    mutation_possible = db.Column(db.String(10), nullable=True)
    donor_willing_mutation = db.Column(db.String(10), nullable=True)
    
    # Lease Information
    land_leased = db.Column(db.String(10), nullable=True)
    lessor_impact_cost = db.Column(db.Numeric(15,2), nullable=True)
    
    # Land Holdings
    total_landholding = db.Column(db.Numeric(10,2), nullable=True)
    structure_assets_cost = db.Column(db.Numeric(15,2), nullable=True)
    holdings_more_2_kanal = db.Column(db.String(10), nullable=True)
    holdings_more_25_kanal = db.Column(db.String(10), nullable=True)
    
    # Impact Assessment
    livelihood_impact = db.Column(db.String(10), nullable=True)
    relocation_involved = db.Column(db.String(10), nullable=True)
    donation_percentage = db.Column(db.Numeric(5,2), nullable=True)
    
    # Financial Valuation
    dc_value = db.Column(db.Numeric(15,2), nullable=True)
    market_value = db.Column(db.Numeric(15,2), nullable=True)
    
    # Consultation and Consent
    consultation_meeting_conducted = db.Column(db.String(10), nullable=True)
    vo_consent = db.Column(db.String(10), nullable=True)
    neighbors_consent = db.Column(db.String(10), nullable=True)
    grm_process_explained = db.Column(db.String(10), nullable=True)
    
    # Donor Understanding
    donor_knows_no_rights = db.Column(db.String(10), nullable=True)
    donor_knows_equal_access = db.Column(db.String(10), nullable=True)
    donor_willing_pay_taxes = db.Column(db.String(10), nullable=True)
    
    # Viability and Compliance
    land_viable = db.Column(db.String(10), nullable=True)
    provisions_relaxation_needed = db.Column(db.String(10), nullable=True)
    relaxation_numbers = db.Column(db.Text, nullable=True)
    rationale_for_relaxation = db.Column(db.Text, nullable=True)
    implications_of_relaxation = db.Column(db.Text, nullable=True)
    mitigation_of_implications = db.Column(db.Text, nullable=True)
    
    # File uploads
    fard_malkiyat_file = db.Column(db.String(255), nullable=True)
    affidavit_file = db.Column(db.String(255), nullable=True)
    total_donations_fard_file = db.Column(db.String(255), nullable=True)
    vo_consent_file = db.Column(db.String(255), nullable=True)
    neighbors_consent_file = db.Column(db.String(255), nullable=True)
    relevant_proofs_file = db.Column(db.String(255), nullable=True)
    
    # Status and timestamps
    is_draft = db.Column(db.Boolean, default=True)
    submitted_at = db.Column(db.DateTime, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    case = db.relationship('Case', backref='vld_checklist_forms')
    creator = db.relationship('User', backref='created_vld_forms')

class VLDChecklist(db.Model):
    __tablename__ = 'vld_checklists'
    
    id = db.Column(db.Integer, primary_key=True)
    details_id = db.Column(db.Integer, db.ForeignKey('edcs_user_details.id'), nullable=False)
    option_number = db.Column(db.Integer, nullable=True)
    state_land_available = db.Column(db.String(10), nullable=True)
    community_land_available = db.Column(db.String(10), nullable=True)
    donor_name = db.Column(db.String(255), nullable=True)
    land_area_donated = db.Column(Numeric(10,2), nullable=True)
    donor_cnic = db.Column(db.String(15), nullable=True)
    donor_contact = db.Column(db.String(20), nullable=True)
    land_location = db.Column(db.Text, nullable=True)
    gps_coordinates = db.Column(db.String(100), nullable=True)
    site_photos = db.Column(db.Text, nullable=True)
    committee_comments = db.Column(db.Text, nullable=True)
    document_submitted = db.Column(db.Boolean, default=False)
    physical_verification = db.Column(db.Boolean, default=False)
    is_draft = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    edcs_details = db.relationship('EDCSUserDetails', backref='vld_checklists')
    creator = db.relationship('User', backref='created_vld_checklists')

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    case = db.relationship('Case', backref='notifications')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_notifications')
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_notifications')

class Location(db.Model):
    """Store all Punjab locations with coordinates"""
    __tablename__ = 'locations'

    id = db.Column(db.Integer, primary_key=True)
    region = db.Column(db.String(50))  # South-I, South-II, etc.
    district = db.Column(db.String(100))
    tehsil = db.Column(db.String(100))
    village_name = db.Column(db.String(200))
    village_code = db.Column(db.String(50))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Location {self.village_name}, {self.tehsil}, {self.district}>'

class CaseHistory(db.Model):
    __tablename__ = 'case_history'
    
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    from_stage = db.Column(db.String(50), nullable=True)
    to_stage = db.Column(db.String(50), nullable=True)
    comments = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    case = db.relationship('Case', backref='history')
    performer = db.relationship('User', backref='performed_actions')

class ReturnedForm(db.Model):
    __tablename__ = 'returned_forms'
    
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    returned_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    returned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    stage_returned_from = db.Column(db.String(50), nullable=True)
    returned_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    case = db.relationship('Case', backref='returned_forms')
    returner = db.relationship('User', foreign_keys=[returned_by], backref='returned_forms_by')
    returnee = db.relationship('User', foreign_keys=[returned_to], backref='returned_forms_to')

class CompletedRequest(db.Model):
    __tablename__ = 'completed_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    completed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    completion_date = db.Column(db.DateTime, default=datetime.utcnow)
    final_status = db.Column(db.String(50), nullable=False)
    remarks = db.Column(db.Text, nullable=True)
    
    # Relationships
    case = db.relationship('Case', backref='completed_requests')
    completer = db.relationship('User', backref='completed_requests')

class Followup(db.Model):
    __tablename__ = 'followups'
    
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    raised_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    responded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    query_text = db.Column(db.Text, nullable=False)
    response_text = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='Open')  # Open, Closed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DonorHistory(db.Model):
    __tablename__ = 'donor_history'
    
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    donor_name = db.Column(db.String(100), nullable=False)
    donor_cnic = db.Column(db.String(20), nullable=True)
    donation_type = db.Column(db.String(50), nullable=False)  # Land Donation, Cash Donation, etc.
    donation_amount = db.Column(db.Numeric(15, 2), nullable=True)
    land_details = db.Column(db.Text, nullable=True)
    donated_at = db.Column(db.DateTime, default=datetime.utcnow)
    remarks = db.Column(db.Text, nullable=True)
    # Remove created_at column since it doesn't exist in the database

class VerificationSummary(db.Model):
    __tablename__ = 'verification_summary'
    
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    verification_date = db.Column(db.DateTime, default=datetime.utcnow)
    verification_status = db.Column(db.String(20), nullable=False)  # Verified, Pending, Rejected
    summary = db.Column(db.Text, nullable=False)
    stage = db.Column(db.String(50), nullable=True)
    # Remove created_at if it doesn't exist in the database

class DMChecklist(db.Model):
    __tablename__ = 'dm_checklist'
    
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    question_number = db.Column(db.Integer, nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    edcs_response = db.Column(db.Text, nullable=True)
    dm_response = db.Column(db.String(50), nullable=True)
    dm_remarks = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    case = db.relationship('Case', backref='dm_checklist_responses')
    creator = db.relationship('User', backref='dm_checklist_entries')

class BCCChecklist(db.Model):
    __tablename__ = 'bcc_checklist'

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    question_number = db.Column(db.Integer, nullable=False)
    question_text = db.Column(db.Text, nullable=True)
    bcc_response = db.Column(db.String(50), nullable=True)
    bcc_remarks = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    case = db.relationship('Case', backref='bcc_checklist_responses')
    creator = db.relationship('User', backref='bcc_checklist_responses')

class TMChecklist(db.Model):
    __tablename__ = 'tm_checklist'

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    question_number = db.Column(db.Integer, nullable=False)
    question_text = db.Column(db.Text, nullable=True)
    tm_response = db.Column(db.String(50), nullable=True)
    tm_remarks = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    case = db.relationship('Case', backref='tm_checklist_responses')
    creator = db.relationship('User', backref='tm_checklist_responses')

class BCCSPChecklist(db.Model):
    __tablename__ = 'bccsp_checklist'

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.case_id'), nullable=False)
    question_number = db.Column(db.Integer, nullable=False)
    question_text = db.Column(db.Text, nullable=True)
    bccsp_response = db.Column(db.String(50), nullable=True)
    bccsp_remarks = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    case = db.relationship('Case', backref='bccsp_checklist_responses')
    creator = db.relationship('User', backref='bccsp_checklist_responses')

