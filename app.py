from flask import Flask, json, render_template, request, redirect, url_for, flash, session, jsonify, send_from_directory
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_mail import Mail, Message
from werkzeug.utils import secure_filename
from database.models import (
    db, User, LoginAttempt, UserSession, EDCSUserDetails, EDCSStateLandOption,
    Case, StateLandForm, VLDChecklistForm, VLDChecklist, Notification,
    CaseHistory, ReturnedForm, CompletedRequest, Followup, DonorHistory,
    VerificationSummary, DMChecklist, BCCChecklist, TMChecklist, BCCSPChecklist
)
import os
from datetime import datetime, timedelta, date
import secrets
import uuid

app = Flask(__name__, template_folder='templates', static_folder='static')

def safe_float_convert(value, return_none_on_empty=True):
    """Safely convert string to float, return None or 0.0 if conversion fails

    Args:
        value: The value to convert
        return_none_on_empty: If True, return None for empty values; if False, return 0.0
    """
    if not value or value == '':
        return None if return_none_on_empty else 0.0
    try:
        # Handle common non-numeric values
        if isinstance(value, str):
            value = value.strip()
            if value.lower() in ['yes', 'no', 'male', 'female', 'individual', 'agricultural', 'fertile']:
                return None if return_none_on_empty else 0.0
        return float(value)
    except (ValueError, TypeError):
        return None if return_none_on_empty else 0.0

def safe_int_convert(value):
    """Safely convert string to int, return 0 if conversion fails"""
    if not value or value == '':
        return 0
    try:
        if isinstance(value, str):
            value = value.strip()
            if value.lower() in ['yes', 'no', 'male', 'female', 'individual', 'agricultural', 'fertile']:
                return 0
        return int(value)
    except (ValueError, TypeError):
        return 0

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/assets/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Email configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your-email@gmail.com'  # Replace with your email
app.config['MAIL_PASSWORD'] = 'your-app-password'     # Replace with your app password
app.config['MAIL_DEFAULT_SENDER'] = 'your-email@gmail.com'

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx'}

# Initialize extensions
db.init_app(app)
mail = Mail(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Static file routes
@app.route('/assets/<path:filename>')
def assets(filename):
    return send_from_directory('static/assets', filename)

@app.route('/css/<path:filename>')
def css(filename):
    return send_from_directory('static/css', filename)

@app.route('/js/<path:filename>')
def js(filename):
    return send_from_directory('static/js', filename)

@app.route('/vendor/<path:filename>')
def vendor(filename):
    return send_from_directory('static/js', filename)

@app.route('/img/<path:filename>')
def img(filename):
    return send_from_directory('static/assets/img', filename)

# Main routes - redirect to login
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        remember = request.form.get('remember') == 'on'
        
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password) and user.is_active:
            login_user(user, remember=remember)
            user.update_last_login()
            flash('Login successful!', 'success')

            # Redirect user based on ROLE
            if user.role == 'BCCO':
                return redirect(url_for('bcc_dashboard'))
            elif user.role == 'EDCS':
                return redirect(url_for('edcs_dashboard'))
            elif user.role == 'DM':
                return redirect(url_for('dm_dashboard'))
            elif user.role == 'TM':
                return redirect(url_for('tm_dashboard'))  # Will redirect to TM.html
            elif user.role == 'BCCSP':
                return redirect(url_for('dashboard'))  # Will redirect to BCCSP.html
            else:
                return redirect(url_for('dashboard'))  # Default dashboard
        else:
            flash('Invalid email or password.', 'error')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        # Check if passwords match
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return render_template('register.html')
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=request.form['email']).first()
        if existing_user:
            flash('Email already registered. Please use a different email.', 'error')
            return render_template('register.html')
        
        # Handle profile picture upload
        profile_picture_filename = None
        if 'profile_picture' in request.files:
            file = request.files['profile_picture']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Create unique filename to avoid conflicts
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                
                # Create upload directory if it doesn't exist
                os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                file.save(file_path)
                profile_picture_filename = unique_filename
        
        # Map designation to role
        designation_to_role = {
            'BCC Officer': 'BCCO',
            'EDCS Person': 'EDCS', 
            'Deputy Manager': 'DM',
            'Tehsil Manager': 'TM',
            'BCC Specialist': 'BCCSP'
        }
        
        designation = request.form['designation']
        role = designation_to_role.get(designation, 'USER')  # Default to USER if not found
        
        user = User(
            name=request.form['name'],
            email=request.form['email'],
            phone=request.form['phone'],
            birth_date=datetime.strptime(request.form['birth_date'], '%Y-%m-%d').date(),
            gender='Male',  # Default gender since removed from form
            region=request.form['region'],
            district=request.form['district'],
            tehsil=request.form['tehsil'],
            village=request.form.get('village'),
            village_code=request.form.get('village_code'),
            village_latitude=float(request.form['village_latitude']) if request.form.get('village_latitude') else None,
            village_longitude=float(request.form['village_longitude']) if request.form.get('village_longitude') else None,
            address_line1=request.form['address_line1'],
            postal_code='00000',  # Default postal code since removed from form
            designation=designation,
            department=get_department_from_designation(designation),  # Auto-assign department
            role=role,
            cnic=request.form.get('cnic'),  # Optional field
            profile_picture=profile_picture_filename
        )
        
        # Set password
        user.set_password(password)
        
        try:
            db.session.add(user)
            db.session.commit()
            
            flash('Registration successful! Please login with your credentials.', 'success')
            return redirect(url_for('login'))
            
        except Exception as e:
            db.session.rollback()
            flash('Registration failed. Please try again.', 'error')
            return render_template('register.html')
    
    return render_template('register.html')

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_department_from_designation(designation):
    """Auto-assign department based on designation"""
    department_mapping = {
        'BCC Officer': 'BCC Department',
        'EDCS Person': 'EDCS Department', 
        'Deputy Manager': 'Management Department',
        'Tehsil Manager': 'Tehsil Management',
        'BCC Specialist': 'BCC Specialist Department'
    }
    return department_mapping.get(designation, 'General Department')

@app.route('/dashboard')
@login_required
def dashboard():
    # Show general dashboard for all users with comprehensive statistics
    from datetime import datetime, date
    from sqlalchemy import func, case as sql_case

    # Village Data Structure (hardcoded - source of truth for locations)
    village_data_structure = {
        "South-I": {
            "Bahawalnagar": {
                "Bahawalnagar": [
                    {"name": "RATI RAMPURA", "code": "33333", "lat": "29.66339302", "lng": "73.27627563"},
                    {"name": "KAMAL MOHD", "code": "33289", "lat": "29.76139832", "lng": "73.17256165"},
                    {"name": "CHAK GHULAM MUHAMMAD", "code": "33367", "lat": "29.92119026", "lng": "73.19380951"},
                    {"name": "NANAK CHAND", "code": "33307", "lat": "29.89110947", "lng": "73.05485535"},
                    {"name": "MANOHAR GARH", "code": "33376", "lat": "29.88731575", "lng": "73.1785202"},
                    {"name": "TOBA ALLAHYAR", "code": "33383", "lat": "29.8591423", "lng": "73.31604767"},
                    {"name": "MURAD KHARAL", "code": "33364", "lat": "29.85290337", "lng": "73.11303711"},
                    {"name": "ANOKH SINGH", "code": "33247", "lat": "30.04998398", "lng": "73.33756256"},
                    {"name": "CHAK MUHAMMAD ZAMAN", "code": "33377", "lat": "29.9564476", "lng": "73.14221954"},
                    {"name": "MOMIN ABAD", "code": "33356", "lat": "29.9570446", "lng": "73.0617981"},
                    {"name": "PHOGANWALA", "code": "33360", "lat": "29.95088196", "lng": "73.06731415"},
                    {"name": "CHAK SADIQ NAGAR", "code": "33175", "lat": "29.90852356", "lng": "72.97138214"},
                    {"name": "KAKKU BODLA", "code": "33235", "lat": "30.08294868", "lng": "73.21486664"},
                    {"name": "ATAR SINGH SANI", "code": "33280", "lat": "30.00065041", "lng": "73.34818268"},
                    {"name": "MOHD YAR CHISHTI", "code": "33368", "lat": "29.90116501", "lng": "73.15867615"},
                    {"name": "KHETRAN WALA", "code": "33308", "lat": "29.71038055", "lng": "73.15775299"},
                    {"name": "QAMARUDIN BODLA", "code": "33233", "lat": "30.04791451", "lng": "73.22874451"},
                    {"name": "KAHANPURA", "code": "33278", "lat": "29.91546822", "lng": "73.29209137"},
                    {"name": "RAMZAN LANGAH", "code": "33220", "lat": "30.08884621", "lng": "73.26938629"},
                    {"name": "QAMAR0-UD-DIN", "code": "33223", "lat": "30.02606583", "lng": "73.21582031"},
                    {"name": "JANDWALA KHURD", "code": "33294", "lat": "29.78215981", "lng": "73.11348724"},
                    {"name": "GANGA SINGH", "code": "33284", "lat": "29.88035965", "lng": "73.09680939"}
                ]
            }
        },
        "South-II": {
            "Lodhran": {
                "Karor Pacca": [
                    {"name": "ALI PUR KANJUN", "code": "26661", "lat": "29.67061615", "lng": "71.8780365"},
                    {"name": "CHOKI RANGO KHAN", "code": "26662", "lat": "29.72247696", "lng": "71.88756561"},
                    {"name": "GULHAR", "code": "26557", "lat": "29.7348175", "lng": "71.89356232"},
                    {"name": "JHOK AHIR", "code": "26249", "lat": "29.50398254", "lng": "71.88619232"},
                    {"name": "MOHAMMAD PUR", "code": "26230", "lat": "29.70200348", "lng": "71.88573456"},
                    {"name": "CHOKI SOBHA KHAN", "code": "26552", "lat": "29.74905205", "lng": "71.92613983"},
                    {"name": "PYWAGNAN", "code": "26236", "lat": "29.50541878", "lng": "71.82138824"},
                    {"name": "NOOR SHAH", "code": "26653", "lat": "29.66440964", "lng": "71.76231384"},
                    {"name": "30/M", "code": "26416", "lat": "29.67547989", "lng": "71.72536469"},
                    {"name": "HASSA JOYA", "code": "26568", "lat": "29.57269287", "lng": "72.09596252"},
                    {"name": "DHORAH MAHAR", "code": "26549", "lat": "29.7567482", "lng": "71.93684387"}
                ]
            },
            "Multan": {
                "Shuja Abad": [
                    {"name": "MARI NOON", "code": "26708", "lat": "29.77522087", "lng": "71.42314911"},
                    {"name": "JALAL PUR KHAKHI", "code": "26723", "lat": "29.76013947", "lng": "71.21868134"},
                    {"name": "BASTI MITHU SHARQI", "code": "36502", "lat": "29.84164047", "lng": "71.29672241"},
                    {"name": "GURDEZ PUR", "code": "26716", "lat": "29.80830765", "lng": "71.25707245"},
                    {"name": "OBAWRHA SHUMALI", "code": "26734", "lat": "29.71147537", "lng": "71.302948"},
                    {"name": "MAQEEM PUR", "code": "26698", "lat": "29.78413773", "lng": "71.35295105"},
                    {"name": "KULUCH PUR", "code": "26712", "lat": "29.73161125", "lng": "71.33837128"},
                    {"name": "WAHI NOON", "code": "26692", "lat": "29.84453011", "lng": "71.42159271"},
                    {"name": "KHARA", "code": "26721", "lat": "29.74036407", "lng": "71.25557709"},
                    {"name": "BASTI MITHU GHARBI", "code": "26699", "lat": "29.82444572", "lng": "71.33898926"},
                    {"name": "THATHA GHULWAN SHUMALI", "code": "26732", "lat": "29.69717979", "lng": "71.34399414"},
                    {"name": "JHAKAR", "code": "26694", "lat": "29.78223038", "lng": "71.44061279"}
                ]
            },
            "Muzaffargarh": {
                "Alipur": [
                    {"name": "YAKEWALI", "code": "31806", "lat": "29.43502617", "lng": "70.94895935"},
                    {"name": "AZMAT PUR", "code": "31800", "lat": "29.33360672", "lng": "70.9749527"},
                    {"name": "GHAUS PUR", "code": "31734", "lat": "29.31291199", "lng": "70.87371063"},
                    {"name": "BET NABI SHAH", "code": "31798", "lat": "29.3533802", "lng": "70.91960144"},
                    {"name": "MADD SOHANARA SHAH", "code": "31911", "lat": "29.37289429", "lng": "70.63371277"},
                    {"name": "PIRO WALI", "code": "31826", "lat": "29.45939445", "lng": "70.90297699"},
                    {"name": "BET MULLAN WALI", "code": "31793", "lat": "29.3240242", "lng": "70.93354034"},
                    {"name": "NAU ABAD", "code": "31872", "lat": "29.34475708", "lng": "70.70800781"},
                    {"name": "KHIRORAH FAZAL MOHD", "code": "31821", "lat": "29.43404961", "lng": "71.01494598"},
                    {"name": "WALWAT", "code": "31786", "lat": "29.21809387", "lng": "70.61386108"}
                ]
            }
        },
        "South-III": {
            "D.G.Khan": {
                "Taunsa": [
                    {"name": "SANJAR SHAHI", "code": "29861", "lat": "30.48601532", "lng": "70.72777557"},
                    {"name": "KALUWALA", "code": "29712", "lat": "31.22917747", "lng": "70.74665833"},
                    {"name": "BASTI PIR", "code": "29841", "lat": "30.52420616", "lng": "70.77693176"},
                    {"name": "JHOK MANU", "code": "29867", "lat": "30.54255486", "lng": "70.62223053"},
                    {"name": "CHOLANI", "code": "29894", "lat": "30.54818535", "lng": "70.72003937"},
                    {"name": "BOHAR", "code": "29871", "lat": "31.17069435", "lng": "70.5936203"},
                    {"name": "RIND WALA", "code": "29779", "lat": "30.93849564", "lng": "70.59538269"},
                    {"name": "MITHE WALI", "code": "29734", "lat": "31.20769501", "lng": "70.52633667"},
                    {"name": "LAKHU", "code": "29746", "lat": "30.82009888", "lng": "70.73555756"},
                    {"name": "KABIR SHAH", "code": "29766", "lat": "30.89525604", "lng": "70.72166443"},
                    {"name": "SONTRA", "code": "29750", "lat": "30.75263023", "lng": "70.65705109"},
                    {"name": "LAL SHAH", "code": "29888", "lat": "30.73312378", "lng": "70.74421692"},
                    {"name": "BUZDAR", "code": "29720", "lat": "30.76307106", "lng": "70.53288269"}
                ]
            },
            "Rahim Yar Khan": {
                "Liaqatpur": [
                    {"name": "CHAK NO.45/ABBASIA", "code": "34983", "lat": "28.91923332", "lng": "71.00676727"},
                    {"name": "CHAK NO.5/ABBASIA", "code": "35031", "lat": "28.98629189", "lng": "70.98072052"},
                    {"name": "CHAK NO.30/ABBASIA", "code": "34979", "lat": "28.9252739", "lng": "70.98233795"},
                    {"name": "CHAK NO.25/ABBASIA", "code": "35038", "lat": "28.97833061", "lng": "71.01305389"},
                    {"name": "CHAK NO.17/ABBASIA", "code": "35037", "lat": "28.97742462", "lng": "70.99539948"},
                    {"name": "CHAK NO.29/ABBASIA", "code": "34978", "lat": "28.93990517", "lng": "71.00422668"},
                    {"name": "CHAK NO.44/ABBASIA", "code": "35000", "lat": "28.90553474", "lng": "70.98226929"},
                    {"name": "UNNARRAN", "code": "34973", "lat": "29.03556633", "lng": "70.717659"},
                    {"name": "KOTLA DARIGH", "code": "34855", "lat": "29.05330086", "lng": "70.88162994"},
                    {"name": "ZAFAR ABAD", "code": "34945", "lat": "28.91549492", "lng": "70.67959595"},
                    {"name": "GALANI", "code": "34932", "lat": "28.93846703", "lng": "70.62186432"},
                    {"name": "BAHAN WALA", "code": "34851", "lat": "28.87074852", "lng": "70.87110901"},
                    {"name": "CHAK NO.67/ABBASIA", "code": "34989", "lat": "28.80917931", "lng": "70.87308502"},
                    {"name": "LAL SHAH", "code": "34939", "lat": "28.99964905", "lng": "70.66465759"},
                    {"name": "RAQBA PIR MOHSIN SHAH", "code": "34913", "lat": "29.16436195", "lng": "70.89350128"},
                    {"name": "DODA NAICH", "code": "34879", "lat": "28.96088791", "lng": "70.7819519"},
                    {"name": "GHOUS ABAD", "code": "34952", "lat": "28.94283485", "lng": "70.66769409"},
                    {"name": "CHAK NO.1 ABBASIA", "code": "35061", "lat": "29.06189156", "lng": "71.0226593"},
                    {"name": "CHAK NO.141/ABBASIA", "code": "35025", "lat": "28.89869881", "lng": "71.04517365"}
                ]
            },
            "Rajanpur": {
                "Rojhan": [
                    {"name": "SALEEM ABAD", "code": "32371", "lat": "28.79619598", "lng": "70.07885742"},
                    {"name": "CHAK RANWANI", "code": "32335", "lat": "28.50892067", "lng": "69.90827179"},
                    {"name": "MUTFARQ MAZARI", "code": "32369", "lat": "28.76545525", "lng": "70.0586319"},
                    {"name": "DERA DILDAR", "code": "32358", "lat": "28.71504021", "lng": "70.01274109"},
                    {"name": "KOTLA HUSSAN SHAH", "code": "32411", "lat": "28.87141228", "lng": "70.18093109"},
                    {"name": "KOCHA MIANWALI NO.1", "code": "32368", "lat": "28.5709362", "lng": "70.03663635"},
                    {"name": "CHAK UMRANI", "code": "32336", "lat": "28.55447006", "lng": "69.91217804"},
                    {"name": "KOTLA HAMAL MUSHTARQA MAZARI", "code": "32418", "lat": "29.03167534", "lng": "70.01346588"}
                ]
            }
        },
        "North": {
            "Mianwali": {
                "Isa Khel": [
                    {"name": "KACHH TUNDAR KHEL", "code": "25323", "lat": "33.00159836", "lng": "71.50523376"},
                    {"name": "KHUDOZAI", "code": "25329", "lat": "32.90605927", "lng": "71.43955231"},
                    {"name": "KOTKI", "code": "25330", "lat": "32.95565414", "lng": "71.40391541"},
                    {"name": "GANDA", "code": "25333", "lat": "32.84594727", "lng": "71.4824295"},
                    {"name": "KOT CHANDANA", "code": "25328", "lat": "32.95479202", "lng": "71.47368622"},
                    {"name": "TOLA MANGLI", "code": "25326", "lat": "32.97796631", "lng": "71.44259644"},
                    {"name": "PACCAKIS UMER KHAN", "code": "25341", "lat": "32.71718979", "lng": "71.27375031"},
                    {"name": "KARANDI", "code": "25306", "lat": "32.89575958", "lng": "71.16688538"},
                    {"name": "VANJARI", "code": "25321", "lat": "32.91029739", "lng": "71.24053192"},
                    {"name": "PACCA ATTOCK PANIYALA", "code": "25289", "lat": "32.59204102", "lng": "71.27751923"}
                ]
            }
        },
        "Centre-I": {
            "Bhakkar": {
                "Darya Khan": [
                    {"name": "CHAK NO.17/T.D.A", "code": "25447", "lat": "31.77101517", "lng": "71.18208313"},
                    {"name": "SANDI", "code": "25405", "lat": "31.7753315", "lng": "71.04830933"},
                    {"name": "LUNDI NASHEB", "code": "25409", "lat": "31.83719826", "lng": "71.08499146"},
                    {"name": "MURANI SHUMALI", "code": "25406", "lat": "31.76167488", "lng": "71.03330231"},
                    {"name": "ANGRA DAGGAR", "code": "25627", "lat": "31.83391953", "lng": "71.12277222"},
                    {"name": "HAJI HUSSAIN SHAH DAGAR", "code": "25631", "lat": "31.9311924", "lng": "71.21439362"},
                    {"name": "SURANI DAGGAR", "code": "25432", "lat": "31.76600647", "lng": "71.10552216"},
                    {"name": "SURANI NASHEB", "code": "25415", "lat": "31.768013", "lng": "71.07801056"},
                    {"name": "CHAK NO.52-M.L", "code": "25426", "lat": "31.75600815", "lng": "71.30093384"}
                ]
            },
            "Chiniot": {
                "Bhowana": [
                    {"name": "TAJA BEERWALA", "code": "23776", "lat": "31.59325981", "lng": "72.65531158"},
                    {"name": "CHAK NO 190", "code": "23803", "lat": "31.50672722", "lng": "72.67922974"},
                    {"name": "CHAK 221", "code": "23837", "lat": "31.50691414", "lng": "72.70083618"},
                    {"name": "CHAK 199", "code": "23854", "lat": "31.42183304", "lng": "72.772995"},
                    {"name": "THATTA JHANAB", "code": "23792", "lat": "31.58235741", "lng": "72.69851685"},
                    {"name": "BARKHURDAR", "code": "23794", "lat": "31.60167885", "lng": "72.69709778"},
                    {"name": "CHAK 226", "code": "23816", "lat": "31.44102097", "lng": "72.65831757"},
                    {"name": "SULEMAN", "code": "23629", "lat": "31.49151993", "lng": "72.55583191"},
                    {"name": "BILHARKE", "code": "23769", "lat": "31.64439011", "lng": "72.74494171"},
                    {"name": "HID", "code": "23790", "lat": "31.6080513", "lng": "72.79855347"},
                    {"name": "CHAK 248", "code": "23825", "lat": "31.38063431", "lng": "72.72648621"},
                    {"name": "CHAK 192", "code": "23805", "lat": "31.51522064", "lng": "72.66120911"},
                    {"name": "KAMOKE", "code": "23772", "lat": "31.62464142", "lng": "72.88532257"}
                ]
            },
            "Jhang": {
                "Ahmad Pur Sial": [
                    {"name": "SEWA", "code": "23518", "lat": "30.81372261", "lng": "71.84414673"},
                    {"name": "CHAK NO.11/3-L", "code": "23522", "lat": "30.7982235", "lng": "71.81572723"},
                    {"name": "HAZARAT SULTAN BAHU", "code": "23498", "lat": "30.80641556", "lng": "71.86233521"},
                    {"name": "FATEH PUR PIRTI", "code": "23332", "lat": "30.96380424", "lng": "71.97954559"},
                    {"name": "GUDARA", "code": "23520", "lat": "30.87901878", "lng": "71.85855103"},
                    {"name": "JAIWAIN", "code": "23502", "lat": "30.72973251", "lng": "71.78889465"},
                    {"name": "DAULUANA SHARQI", "code": "23358", "lat": "30.94002533", "lng": "71.88761139"},
                    {"name": "BAKHU SARGANA", "code": "23544", "lat": "30.60009766", "lng": "71.74493408"},
                    {"name": "CHAK NO.2/2-L", "code": "23505", "lat": "30.87892342", "lng": "71.90278625"},
                    {"name": "CHAK NO.3/3-R", "code": "23561", "lat": "30.72080612", "lng": "71.75202179"}
                ]
            }
        },
        "Centre-II": {
            "Pakpattan": {
                "Pakpattan": [
                    {"name": "KARAM PUR BHATTI", "code": "28075", "lat": "30.32689857", "lng": "73.45210266"},
                    {"name": "CHAK NO.57-S.P.", "code": "27980", "lat": "30.45089722", "lng": "73.31311035"},
                    {"name": "BABLANA", "code": "28171", "lat": "30.46024132", "lng": "73.37024689"},
                    {"name": "SOCHAN", "code": "27952", "lat": "30.2751503", "lng": "73.31179047"},
                    {"name": "KILLI", "code": "27945", "lat": "30.2773304", "lng": "73.36994934"},
                    {"name": "CHAK AHMAD SHER", "code": "28096", "lat": "30.51816368", "lng": "73.3892746"},
                    {"name": "KALE WAL", "code": "28051", "lat": "30.44582367", "lng": "73.52979279"},
                    {"name": "ARIF ABAD", "code": "27949", "lat": "30.31208801", "lng": "73.30822754"},
                    {"name": "DEDAR SINGH", "code": "28181", "lat": "30.3439064", "lng": "73.59247589"},
                    {"name": "JIWANA MEHTAM", "code": "28192", "lat": "30.33948898", "lng": "73.56202698"},
                    {"name": "DHAKKU CHISHTI", "code": "27934", "lat": "30.31657219", "lng": "73.34315491"},
                    {"name": "CHAK NO.93/D.", "code": "28013", "lat": "30.50232124", "lng": "73.24982452"},
                    {"name": "CHAK NO.32/S.P.", "code": "27991", "lat": "30.38111496", "lng": "73.30928802"},
                    {"name": "CHAK ELAHYA WALA", "code": "28166", "lat": "30.21905327", "lng": "73.27581024"},
                    {"name": "JATTU WAL", "code": "27944", "lat": "30.29696274", "lng": "73.37992096"},
                    {"name": "CHAK NO.47 S.P.", "code": "28052", "lat": "30.44582367", "lng": "73.55269623"},
                    {"name": "SOHARA", "code": "27936", "lat": "30.28860092", "lng": "73.47647095"},
                    {"name": "CHAK SARDUL SINGH", "code": "27964", "lat": "30.46269989", "lng": "73.32724762"},
                    {"name": "CHAK NO.22.S.P.", "code": "28067", "lat": "30.43542099", "lng": "73.45689392"},
                    {"name": "FARID PUR DOGRAN", "code": "27972", "lat": "30.39821434", "lng": "73.37680817"},
                    {"name": "CHAK NO.66.D.", "code": "28109", "lat": "30.49047279", "lng": "73.39910889"},
                    {"name": "GHURI", "code": "28094", "lat": "30.51001549", "lng": "73.34540558"},
                    {"name": "CHAK NO.34/S.P", "code": "27961", "lat": "30.39634705", "lng": "73.2820816"},
                    {"name": "CHAK NO.86/D", "code": "28035", "lat": "30.52363586", "lng": "73.18489838"}
                ]
            }
        }
    }

    # Extract unique districts, tehsils, villages from village_data_structure
    districts_list = []
    tehsils_list = []
    villages_list = []

    for region, districts in village_data_structure.items():
        for district, tehsils in districts.items():
            if district not in districts_list:
                districts_list.append(district)
            for tehsil, villages in tehsils.items():
                if tehsil not in tehsils_list:
                    tehsils_list.append(tehsil)
                for village in villages:
                    if village['name'] not in villages_list:
                        villages_list.append(village['name'])

    # 1. Total Land Options Collected (all cases)
    total_land_options = Case.query.count()

    # 2. Verified & Endorsed Options (approved cases)
    verified_options = CompletedRequest.query.filter(
        CompletedRequest.final_status.in_(['APPROVED', 'APPROVED_BY_TM'])
    ).count()

    # 3. SOP Relaxation Required
    state_land_relaxation = StateLandForm.query.filter(
        StateLandForm.provisions_relaxation_needed == 'Yes'
    ).count()
    vld_relaxation = VLDChecklistForm.query.filter(
        VLDChecklistForm.provisions_relaxation_needed == 'Yes'
    ).count()
    sop_relaxation_required = state_land_relaxation + vld_relaxation

    # 4. Average State Land Obtained (in Marla)
    avg_state_land = db.session.query(
        func.avg(StateLandForm.land_area)
    ).scalar() or 0

    # 5. Average Private Land Donated (in Marla)
    avg_private_land = db.session.query(
        func.avg(VLDChecklistForm.land_area_donated)
    ).scalar() or 0

    # 6. DC Value of State Land
    dc_value_state = db.session.query(
        func.sum(StateLandForm.dc_value)
    ).scalar() or 0

    # 7. DC Value of Private Land
    dc_value_private = db.session.query(
        func.sum(VLDChecklistForm.dc_value)
    ).scalar() or 0

    # 8. Market Value of State Land
    market_value_state = db.session.query(
        func.sum(StateLandForm.market_value)
    ).scalar() or 0

    # 9. Market Value of Private Land
    market_value_private = db.session.query(
        func.sum(VLDChecklistForm.market_value)
    ).scalar() or 0

    # 10. Get all cases with details for table
    cases_data = db.session.query(
        Case,
        EDCSUserDetails,
        User
    ).join(
        EDCSUserDetails, Case.case_id == EDCSUserDetails.case_id, isouter=True
    ).join(
        User, Case.edcs_user_id == User.id
    ).all()

    # Process cases data for table
    table_data = []
    for case, edcs_details, user in cases_data:
        # Get State Land or VLD form data
        state_form = StateLandForm.query.filter_by(case_id=case.case_id).first()
        vld_form = VLDChecklistForm.query.filter_by(case_id=case.case_id).first()

        # Calculate processing duration
        if case.created_at:
            duration = (datetime.utcnow() - case.created_at).days
        else:
            duration = 0

        # Get completion status
        completed = CompletedRequest.query.filter_by(case_id=case.case_id).first()
        if completed:
            status = completed.final_status
            if completed.completion_date and case.created_at:
                duration = (completed.completion_date - case.created_at).days
        else:
            status = case.status

        table_data.append({
            'date': case.created_at.strftime('%Y-%m-%d') if case.created_at else 'N/A',
            'case_id': case.case_number,
            'tehsil': user.tehsil if user else 'N/A',
            'village': edcs_details.village_name if edcs_details else 'N/A',
            'land_use_purpose': edcs_details.land_proposed_for if edcs_details else 'N/A',
            'area': float(state_form.land_area) if state_form and state_form.land_area else (float(vld_form.land_area_donated) if vld_form and vld_form.land_area_donated else 0),
            'dc_value': float(state_form.dc_value) if state_form and state_form.dc_value else (float(vld_form.dc_value) if vld_form and vld_form.dc_value else 0),
            'market_value': float(state_form.market_value) if state_form and state_form.market_value else (float(vld_form.market_value) if vld_form and vld_form.market_value else 0),
            'donor_gender': vld_form.donor_gender if vld_form else 'N/A',
            'impact_percentage': float(vld_form.donation_percentage) if vld_form and vld_form.donation_percentage else 0,
            'status': status,
            'duration': duration,
            'land_type': case.land_type or 'N/A'
        })

    # 11. Get unique districts, tehsils, villages for filters
    districts = db.session.query(User.district).distinct().all()
    tehsils = db.session.query(User.tehsil).distinct().all()
    villages = db.session.query(EDCSUserDetails.village_name).distinct().all()

    # 12. Get map data (tehsils with coordinates)
    map_data = db.session.query(
        User.tehsil,
        User.district,
        User.village,
        User.village_latitude,
        User.village_longitude
    ).filter(
        User.village_latitude.isnot(None),
        User.village_longitude.isnot(None)
    ).distinct().all()

    # 13. Chart data - Intervention types
    intervention_counts = db.session.query(
        EDCSUserDetails.land_proposed_for,
        func.count(EDCSUserDetails.id)
    ).group_by(EDCSUserDetails.land_proposed_for).all()

    # 14. Gender distribution
    gender_counts = db.session.query(
        VLDChecklistForm.donor_gender,
        func.count(VLDChecklistForm.id)
    ).group_by(VLDChecklistForm.donor_gender).all()

    # 15. Land type distribution
    land_type_counts = db.session.query(
        Case.land_type,
        func.count(Case.case_id)
    ).group_by(Case.land_type).all()

    # 16. State Land vs Private Land Distribution (in Marlas)
    total_state_land = db.session.query(
        func.sum(StateLandForm.land_area)
    ).scalar() or 0

    total_private_land = db.session.query(
        func.sum(VLDChecklistForm.land_area_donated)
    ).scalar() or 0

    total_land_marlas = float(total_state_land) + float(total_private_land)
    state_percentage = (float(total_state_land) / total_land_marlas * 100) if total_land_marlas > 0 else 0
    private_percentage = (float(total_private_land) / total_land_marlas * 100) if total_land_marlas > 0 else 0

    # 17. SOP Relaxation Reasons
    state_relaxation_reasons = db.session.query(
        StateLandForm.rationale_for_relaxation,
        func.count(StateLandForm.id)
    ).filter(
        StateLandForm.provisions_relaxation_needed == 'Yes',
        StateLandForm.rationale_for_relaxation.isnot(None)
    ).group_by(StateLandForm.rationale_for_relaxation).all()

    vld_relaxation_reasons = db.session.query(
        VLDChecklistForm.rationale_for_relaxation,
        func.count(VLDChecklistForm.id)
    ).filter(
        VLDChecklistForm.provisions_relaxation_needed == 'Yes',
        VLDChecklistForm.rationale_for_relaxation.isnot(None)
    ).group_by(VLDChecklistForm.rationale_for_relaxation).all()

    # Combine relaxation reasons
    relaxation_reasons = {}
    for reason, count in state_relaxation_reasons:
        relaxation_reasons[reason] = relaxation_reasons.get(reason, 0) + count
    for reason, count in vld_relaxation_reasons:
        relaxation_reasons[reason] = relaxation_reasons.get(reason, 0) + count

    # 18. % Impact on Land Donor (donation_percentage distribution)
    impact_ranges = {
        '0-10%': 0,
        '11-20%': 0,
        '21-30%': 0,
        '31-50%': 0,
        '50%+': 0
    }

    vld_impacts = db.session.query(VLDChecklistForm.donation_percentage).filter(
        VLDChecklistForm.donation_percentage.isnot(None)
    ).all()

    for (impact,) in vld_impacts:
        impact_val = float(impact)
        if impact_val <= 10:
            impact_ranges['0-10%'] += 1
        elif impact_val <= 20:
            impact_ranges['11-20%'] += 1
        elif impact_val <= 30:
            impact_ranges['21-30%'] += 1
        elif impact_val <= 50:
            impact_ranges['31-50%'] += 1
        else:
            impact_ranges['50%+'] += 1

    # 19. VLD/NOC Summary by Tehsil
    tehsil_summary = db.session.query(
        User.tehsil,
        func.count(Case.case_id).label('total_cases')
    ).join(
        Case, User.id == Case.edcs_user_id
    ).filter(
        User.tehsil.isnot(None),
        User.tehsil != ''
    ).group_by(User.tehsil).all()

    # Debug: Print tehsil summary
    print("DEBUG - Tehsil Summary:", dict(tehsil_summary))

    # 20. Get tehsil markers data from cases
    tehsil_markers = db.session.query(
        User.tehsil,
        User.district,
        func.count(Case.case_id).label('case_count'),
        func.sum(sql_case(
            (Case.land_type == 'State Land', StateLandForm.land_area),
            (Case.land_type == 'VLD', VLDChecklistForm.land_area_donated),
            else_=0
        )).label('total_land'),
        func.avg(User.village_latitude).label('lat'),
        func.avg(User.village_longitude).label('lng')
    ).join(
        Case, User.id == Case.edcs_user_id
    ).outerjoin(
        StateLandForm, Case.case_id == StateLandForm.case_id
    ).outerjoin(
        VLDChecklistForm, Case.case_id == VLDChecklistForm.case_id
    ).filter(
        User.village_latitude.isnot(None),
        User.village_longitude.isnot(None)
    ).group_by(User.tehsil, User.district).all()

    stats = {
        'total_land_options': total_land_options,
        'verified_options': verified_options,
        'sop_relaxation_required': sop_relaxation_required,
        'avg_state_land': round(float(avg_state_land), 2),
        'avg_private_land': round(float(avg_private_land), 2),
        'dc_value_state': int(dc_value_state),
        'dc_value_private': int(dc_value_private),
        'market_value_state': int(market_value_state),
        'market_value_private': int(market_value_private),
        'table_data': table_data,
        'districts': districts_list,  # From village_data_structure
        'tehsils': tehsils_list,  # From village_data_structure
        'villages': villages_list,  # From village_data_structure
        'map_data': [{'tehsil': m[0], 'district': m[1], 'village': m[2], 'lat': m[3], 'lng': m[4]} for m in map_data],
        'intervention_counts': dict(intervention_counts),
        'gender_counts': dict(gender_counts),
        'land_type_counts': dict(land_type_counts),
        'total_state_land': round(float(total_state_land), 2),
        'total_private_land': round(float(total_private_land), 2),
        'total_land_marlas': round(total_land_marlas, 2),
        'state_percentage': round(state_percentage, 1),
        'private_percentage': round(private_percentage, 1),
        'relaxation_reasons': relaxation_reasons,
        'impact_ranges': impact_ranges,
        'tehsil_summary': dict(tehsil_summary),
        'tehsil_markers': [
            {
                'tehsil': t[0],
                'district': t[1],
                'case_count': t[2],
                'total_land': round(float(t[3]), 2) if t[3] else 0,
                'lat': float(t[4]) if t[4] else 0,
                'lng': float(t[5]) if t[5] else 0
            } for t in tehsil_markers
        ],
        'village_data': village_data_structure  # Pass complete village data to template
    }

    return render_template('dashboard/dashboard.html', user=current_user, stats=stats)

@app.route('/dm-dashboard')
@login_required
def dm_dashboard():
    if current_user.role != 'DM':
        flash('Access denied.', 'error')
        return redirect(url_for('dashboard'))
    
    # Get pending cases that are:
    # 1. In DM stage and submitted OR returned_by_bcco (NOT rejected_by_bcco)
    # 2. Not being reviewed by any other DM (reviewing_by_dm is None or current user)
    # 3. From EDCS users in the same tehsil as the current DM
    pending_cases_query = db.session.query(Case, EDCSUserDetails).join(
        EDCSUserDetails, Case.case_id == EDCSUserDetails.case_id
    ).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        Case.current_stage == 'DM',
        Case.status.in_(['submitted', 'reviewing_by_dm', 'returned_by_bcco']),  # Include returned_by_bcco, exclude rejected_by_bcco
        db.or_(
            Case.reviewing_by_dm == None,
            Case.reviewing_by_dm == current_user.id
        ),
        User.tehsil == current_user.tehsil  # Only same tehsil
    ).all()
    
    # Get notifications for this DM
    notifications = Notification.query.filter_by(
        recipient_id=current_user.id,
        is_read=False
    ).order_by(Notification.created_at.desc()).all()
    
    # Create users dictionary for template
    users_dict = {}
    all_dms = User.query.filter_by(role='DM').all()
    for dm in all_dms:
        users_dict[dm.id] = dm
    
    return render_template('DM.html', 
                         user=current_user, 
                         pending_cases=pending_cases_query,
                         notifications=notifications,
                         users_dict=users_dict)

@app.route('/dm/case-details/<int:case_id>')
@login_required
def dm_case_details(case_id):
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Get case with EDCS details
    case_data = db.session.query(Case, EDCSUserDetails).join(
        EDCSUserDetails, Case.case_id == EDCSUserDetails.case_id
    ).filter(Case.case_id == case_id).first()
    
    if not case_data:
        return jsonify({'success': False, 'message': 'Case not found'})
    
    case, edcs_details = case_data
    
    # Get form data based on land type
    form_data = None
    if case.land_type == 'State Land':
        form_data = StateLandForm.query.filter_by(case_id=case_id).first()
    elif case.land_type == 'Voluntary Land Donation':
        form_data = VLDChecklistForm.query.filter_by(case_id=case_id).first()
    
    return jsonify({
        'success': True,
        'case': {
            'case_number': case.case_number,
            'land_type': case.land_type,
            'status': case.status,
            'created_at': case.created_at.strftime('%Y-%m-%d')
        },
        'edcs_details': {
            'consultant_name': edcs_details.consultant_name,
            'region': edcs_details.region,
            'village_name': edcs_details.village_name,
            'settlement_name': edcs_details.settlement_name,
            'area_required_marla': str(edcs_details.area_required_marla),
            'land_proposed_for': edcs_details.land_proposed_for
        },
        'form_data': form_data.__dict__ if form_data else None
    })

@app.route('/dm/process-case', methods=['POST'])
@login_required
def dm_process_case():
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        case_id = request.form.get('case_id')
        action = request.form.get('action')
        remarks = request.form.get('remarks', '')
        
        case = Case.query.get_or_404(case_id)
        
        # Check if case is being reviewed by current DM
        if case.reviewing_by_dm and case.reviewing_by_dm != current_user.id:
            reviewing_dm = User.query.get(case.reviewing_by_dm)
            return jsonify({
                'success': False, 
                'message': f'Case is currently being reviewed by {reviewing_dm.name}'
            })
        
        # Get existing DM checklist responses for this case
        dm_checklist_responses = DMChecklist.query.filter_by(case_id=case_id).all()
        checklist_summary = ""
        if dm_checklist_responses:
            checklist_summary = f" DM Checklist: {len(dm_checklist_responses)} items reviewed."
        
        if action == 'approve':
            case.current_stage = 'BCCO'
            case.status = 'approved'
            case.reviewing_by_dm = None  # Clear reviewing status

            # Find BCCO from same tehsil
            bcc_officer = User.query.filter_by(role='BCCO', tehsil=current_user.tehsil).first()
            if not bcc_officer:
                # Fallback to any BCCO if none in same tehsil
                bcc_officer = User.query.filter_by(role='BCCO').first()

            if bcc_officer:
                case.assigned_to_bcc_officer = bcc_officer.id
                
                # Get DM checklist responses to include in notification
                dm_responses = DMChecklist.query.filter_by(case_id=case_id).all()
                dm_summary = ""
                if dm_responses:
                    approved_items = [r for r in dm_responses if r.dm_response == 'Approved']
                    dm_summary = f" ({len(approved_items)}/{len(dm_responses)} items approved)"
                
                notification = Notification(
                    case_id=case.case_id,
                    recipient_id=bcc_officer.id,
                    sender_id=current_user.id,
                    message=f'Case {case.case_number} approved by DM {current_user.name} and forwarded for review{dm_summary}',
                    notification_type='FORWARDED'
                )
                db.session.add(notification)
            
            completed_request = CompletedRequest(
                case_id=case.case_id,
                completed_by=current_user.id,
                final_status='APPROVED',
                remarks=f'Approved by DM {current_user.name}: {remarks}{checklist_summary}',
                completion_date=datetime.utcnow()
            )
            db.session.add(completed_request)
            
            history = CaseHistory(
                case_id=case.case_id,
                action='DM_APPROVED',
                performed_by=current_user.id,
                from_stage='DM',
                to_stage='BCC_OFFICER',
                comments=f'DM {current_user.name} approved and forwarded to BCC Officer. Remarks: {remarks}{checklist_summary}'
            )
            
        elif action == 'reject':
            case.status = 'rejected'
            case.current_stage = 'COMPLETED'
            case.reviewing_by_dm = None  # Clear reviewing status
            
            completed_request = CompletedRequest(
                case_id=case.case_id,
                completed_by=current_user.id,
                final_status='REJECTED',
                remarks=f'Rejected by DM {current_user.name}: {remarks}{checklist_summary}',
                completion_date=datetime.utcnow()
            )
            db.session.add(completed_request)
            
            history = CaseHistory(
                case_id=case.case_id,
                action='DM_REJECTED',
                performed_by=current_user.id,
                from_stage='DM',
                to_stage='COMPLETED',
                comments=f'DM {current_user.name} rejected the case. Remarks: {remarks}{checklist_summary}'
            )
            
        elif action == 'return':
            case.current_stage = 'EDCS'
            case.status = 'draft'
            case.reviewing_by_dm = None  # Clear reviewing status
            
            returned_form = ReturnedForm(
                case_id=case.case_id,
                returned_by=current_user.id,
                returned_to=case.edcs_user_id,
                reason=f'{remarks}{checklist_summary}',
                stage_returned_from='DM',
                returned_at=datetime.utcnow()
            )
            db.session.add(returned_form)
            
            notification = Notification(
                case_id=case.case_id,
                recipient_id=case.edcs_user_id,
                sender_id=current_user.id,
                message=f'Case {case.case_number} returned by DM {current_user.name} for revision',
                notification_type='RETURNED'
            )
            db.session.add(notification)
            
            history = CaseHistory(
                case_id=case.case_id,
                action='DM_RETURNED',
                performed_by=current_user.id,
                from_stage='DM',
                to_stage='EDCS',
                comments=f'DM {current_user.name} returned to EDCS for revision. Remarks: {remarks}{checklist_summary}'
            )
        
        db.session.add(history)
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'Case {action}d successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/dm/notifications')
@login_required
def dm_notifications():
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    notifications = Notification.query.filter_by(
        recipient_id=current_user.id
    ).order_by(Notification.created_at.desc()).all()
    
    notification_data = []
    for notif in notifications:
        case = Case.query.get(notif.case_id)
        notification_data.append({
            'id': notif.id,
            'case_number': case.case_number if case else 'N/A',
            'message': notif.message,
            'type': notif.notification_type,
            'is_read': notif.is_read,
            'created_at': notif.created_at.strftime('%Y-%m-%d %H:%M')
        })
    
    return jsonify({'success': True, 'notifications': notification_data})

@app.route('/dm/mark-notification-read/<int:notification_id>', methods=['POST'])
@login_required
def mark_notification_read(notification_id):
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    notification = Notification.query.filter_by(
        id=notification_id,
        recipient_id=current_user.id
    ).first()
    
    if notification:
        notification.is_read = True
        db.session.commit()
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'message': 'Notification not found'})

@app.route('/edcs-dashboard')
@login_required
def edcs_dashboard():
    if current_user.role != 'EDCS':
        flash('Access denied.', 'error')
        return redirect(url_for('dashboard'))
    
    # Get user's EDCS details
    edcs_details = EDCSUserDetails.query.filter_by(created_by=current_user.id).all()
    
    # Get user's state land forms
    state_land_forms = EDCSStateLandOption.query.filter_by(created_by=current_user.id).all()
    
    return render_template('EDCS.html', 
                         user_name=current_user.name,
                         edcs_details=edcs_details,
                         state_land_forms=state_land_forms)

@app.route('/edcs/user-details', methods=['POST'])
@login_required
def submit_edcs_user_details():
    """
    Save EDCS User Details form - this does NOT create a Case yet.
    Cases are only created when State Land or VLD forms are submitted.
    """
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        is_draft = request.form.get('is_draft') == 'true'
        land_type = request.form.get('land_type_selected')

        if not land_type:
            return jsonify({'success': False, 'message': 'Land type is required'})

        # Create EDCS user details WITHOUT a case
        edcs_details = EDCSUserDetails(
            case_id=None,  # No case yet - will be created when State Land/VLD form is submitted
            form_filling_date=datetime.strptime(request.form.get('form_filling_date'), '%Y-%m-%d').date(),
            consultant_name=request.form.get('consultant_name'),
            region=request.form.get('region'),
            village_name=request.form.get('village_name'),
            settlement_name=request.form.get('settlement_name'),
            scheme_interventions=request.form.get('scheme_interventions'),
            land_proposed_for=request.form.get('land_proposed_for'),
            area_required_marla=safe_float_convert(request.form.get('area_required_marla'), return_none_on_empty=False),
            options_identified=int(request.form.get('options_identified')),
            land_type_selected=land_type,
            is_draft=is_draft,
            created_by=current_user.id
        )

        db.session.add(edcs_details)
        db.session.commit()

        message = f'EDCS User Details draft saved!' if is_draft else f'EDCS User Details submitted! You can now fill the {land_type} form.'

        return jsonify({
            'success': True,
            'message': message,
            'details_id': edcs_details.id,
            'land_type_selected': land_type
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/edcs/check-land-type/<int:details_id>')
@login_required
def check_land_type(details_id):
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    edcs_details = EDCSUserDetails.query.filter_by(
        id=details_id,
        created_by=current_user.id
    ).first()
    
    if not edcs_details:
        return jsonify({'success': False, 'message': 'Details not found'})
    
    return jsonify({
        'success': True,
        'land_type_selected': edcs_details.land_type_selected
    })

@app.route('/edcs/state-land-form/<int:details_id>')
@login_required
def edcs_state_land_form(details_id):
    if current_user.role != 'EDCS':
        flash('Access denied.', 'error')
        return redirect(url_for('dashboard'))
    
    # Get the EDCS details to ensure it exists and belongs to current user
    edcs_details = EDCSUserDetails.query.filter_by(
        id=details_id, 
        created_by=current_user.id
    ).first()
    
    if not edcs_details:
        flash('EDCS details not found.', 'error')
        return redirect(url_for('edcs_dashboard'))
    
    # Check if user selected State Land
    if edcs_details.land_type_selected != 'State Land':
        flash('Access denied. This form is only available for State Land selection.', 'error')
        return redirect(url_for('edcs_dashboard'))
    
    # Check if there's already a draft for this details_id
    existing_draft = EDCSStateLandOption.query.filter_by(
        details_id=details_id,
        created_by=current_user.id,
        is_draft=True
    ).first()
    
    return render_template('EDCS.html', 
                         details_id=details_id, 
                         edcs_details=edcs_details,
                         existing_draft=existing_draft,
                         form_type='state_land')

@app.route('/edcs/vld-form/<int:details_id>')
@login_required
def edcs_vld_form(details_id):
    if current_user.role != 'EDCS':
        flash('Access denied.', 'error')
        return redirect(url_for('dashboard'))
    
    # Get the EDCS details to ensure it exists and belongs to current user
    edcs_details = EDCSUserDetails.query.filter_by(
        id=details_id, 
        created_by=current_user.id
    ).first()
    
    if not edcs_details:
        flash('EDCS details not found.', 'error')
        return redirect(url_for('edcs_dashboard'))
    
    # Check if user selected Voluntary Land Donation
    if edcs_details.land_type_selected != 'Voluntary Land Donation':
        flash('Access denied. This form is only available for Voluntary Land Donation selection.', 'error')
        return redirect(url_for('edcs_dashboard'))
    
    # Check if there's already a draft for this details_id
    existing_draft = VLDChecklist.query.filter_by(
        details_id=details_id,
        created_by=current_user.id,
        is_draft=True
    ).first()
    
    return render_template('EDCS.html', 
                         details_id=details_id, 
                         edcs_details=edcs_details,
                         existing_draft=existing_draft,
                         form_type='vld')

@app.route('/edcs/vld-form/save', methods=['POST'])
@login_required
def save_vld_form():
    """
    Save VLD Checklist form - creates a Case when submitted (not draft).
    Links the case to the existing EDCSUserDetails record.
    """
    try:
        is_draft = request.form.get('is_draft') == 'true'
        details_id = request.form.get('details_id')

        # Debug: Print all form data with expected types
        print("=== VLD FORM TYPE DEBUG ===")
        
        # Define expected types for each field based on the model
        expected_types = {
            'option_number': 'int',
            'state_land_available': 'str',
            'community_land_available': 'str', 
            'vld_reasons': 'str',
            'comparative_analysis': 'str',
            'cost_analysis': 'str',
            'donor_vulnerable_group': 'str',
            'donor_poverty_line': 'str',
            'female_head_household': 'str',
            'land_type': 'str',
            'category_jointly_recognized': 'str',
            'land_area_donated': 'float',
            'donor_name': 'str',
            'donor_gender': 'str',
            'landholding_title': 'str',
            'land_on_donor_name': 'str',
            'land_pledged': 'str',
            'legal_encumbrance': 'str',
            'social_legal_dispute': 'str',
            'mutation_possible': 'str',
            'donor_willing_mutation': 'str',
            'land_leased': 'str',
            'lessor_impact_cost': 'float',
            'total_landholding': 'float',
            'structure_assets_cost': 'float',
            'holdings_more_2_kanal': 'str',
            'holdings_more_25_kanal': 'str',
            'livelihood_impact': 'str',
            'relocation_involved': 'str',
            'donation_percentage': 'float',
            'dc_value': 'float',
            'market_value': 'float',
            'consultation_meeting_conducted': 'str',
            'vo_consent': 'str',
            'neighbors_consent': 'str',
            'grm_process_explained': 'str',
            'donor_knows_no_rights': 'str',
            'donor_knows_equal_access': 'str',
            'donor_willing_pay_taxes': 'str',
            'land_viable': 'str',
            'provisions_relaxation_needed': 'str',
            'relaxation_numbers': 'str',
            'rationale_for_relaxation': 'str',
            'implications_of_relaxation': 'str',
            'mitigation_of_implications': 'str'
        }
        
        for key, value in request.form.items():
            if key in expected_types:
                expected_type = expected_types[key]
                actual_type = type(value).__name__
                print(f"{key}: Expected={expected_type}, Actual={actual_type}, Value='{value}'")
                
                # Check for type mismatches
                if expected_type in ['float', 'int'] and value and not value.replace('.', '').replace('-', '').isdigit():
                    print(f"  ⚠️  TYPE MISMATCH: {key} expects {expected_type} but got non-numeric value '{value}'")
        
        print("=== END TYPE DEBUG ===")

        if not details_id:
            return jsonify({'success': False, 'message': 'User details ID is required'})

        # Get the EDCS user details
        edcs_details = EDCSUserDetails.query.filter_by(
            id=details_id,
            created_by=current_user.id
        ).first()

        if not edcs_details:
            return jsonify({'success': False, 'message': 'User details not found'})

        # Create case if it doesn't exist (for both draft and submitted)
        case = None
        if edcs_details.case_id:
            case = Case.query.get(edcs_details.case_id)

        if not case:
            # Create new case (even for drafts, since VLD form requires a case)
            year = datetime.now().year
            prefix = f"VLD-{year}-"
            existing_count = Case.query.filter(Case.case_number.like(f"{prefix}%")).count()
            case_number = f"{prefix}{str(existing_count + 1).zfill(4)}"

            case = Case(
                case_number=case_number,
                edcs_user_id=current_user.id,
                land_type='Voluntary Land Donation',
                status='draft' if is_draft else 'submitted',
                current_stage='EDCS' if is_draft else 'DM'
            )
            db.session.add(case)
            db.session.flush()  # Get case_id

            # Link case to user details
            edcs_details.case_id = case.case_id
            edcs_details.is_draft = is_draft

        # Check if form exists
        existing_form = None
        if case:
            existing_form = VLDChecklistForm.query.filter_by(case_id=case.case_id).first()

        if existing_form:
            vld_form = existing_form
        else:
            vld_form = VLDChecklistForm(
                case_id=case.case_id if case else None,
                created_by=current_user.id
            )

        # Update form fields - Basic Information
        vld_form.option_number = int(request.form.get('option_number', 1))
        vld_form.state_land_available = request.form.get('state_land_available')
        vld_form.community_land_available = request.form.get('community_land_available')

        # VLD Justification
        vld_form.vld_reasons = request.form.get('vld_reasons')
        vld_form.comparative_analysis = request.form.get('comparative_analysis')
        vld_form.cost_analysis = request.form.get('cost_analysis')

        # Donor Vulnerability Assessment
        vld_form.donor_vulnerable_group = request.form.get('donor_vulnerable_group')
        vld_form.donor_poverty_line = request.form.get('donor_poverty_line')
        vld_form.female_head_household = request.form.get('female_head_household')

        # Land Details
        vld_form.land_type = request.form.get('land_type')
        vld_form.category_jointly_recognized = request.form.get('category_jointly_recognized')
        vld_form.land_area_donated = safe_float_convert(request.form.get('land_area_donated', ''))

        # Donor Information
        vld_form.donor_name = request.form.get('donor_name')
        vld_form.donor_gender = request.form.get('donor_gender')
        vld_form.landholding_title = request.form.get('landholding_title')

        # Legal Status - These fields are not in the current form, set to None
        vld_form.land_on_donor_name = request.form.get('land_on_donor_name', None)
        vld_form.land_pledged = request.form.get('land_pledged', None)
        vld_form.legal_encumbrance = request.form.get('legal_encumbrance', None)
        vld_form.social_legal_dispute = request.form.get('social_legal_dispute', None)
        vld_form.mutation_possible = request.form.get('mutation_possible', None)
        vld_form.donor_willing_mutation = request.form.get('donor_willing_mutation', None)

        # Lease Information - land_leased not in form, lessor_impact_cost not in form
        vld_form.land_leased = request.form.get('land_leased', None)
        vld_form.lessor_impact_cost = safe_float_convert(request.form.get('lessor_impact_cost', ''))

        # Land Holdings
        vld_form.total_landholding = safe_float_convert(request.form.get('total_landholding', ''))
        vld_form.structure_assets_cost = safe_float_convert(request.form.get('structure_assets_cost', ''))
        vld_form.holdings_more_2_kanal = request.form.get('holdings_more_2_kanal')
        vld_form.holdings_more_25_kanal = request.form.get('holdings_more_25_kanal')

        # Impact Assessment
        vld_form.livelihood_impact = request.form.get('livelihood_impact')
        vld_form.relocation_involved = request.form.get('relocation_involved')
        vld_form.donation_percentage = safe_float_convert(request.form.get('donation_percentage', ''))

        # Financial Valuation
        vld_form.dc_value = safe_float_convert(request.form.get('dc_value', ''))
        vld_form.market_value = safe_float_convert(request.form.get('market_value', ''))

        # Consultation and Consent
        vld_form.consultation_meeting_conducted = request.form.get('consultation_meeting_conducted')
        vld_form.vo_consent = request.form.get('vo_consent')
        vld_form.neighbors_consent = request.form.get('neighbors_consent')
        vld_form.grm_process_explained = request.form.get('grm_process_explained')

        # Donor Understanding
        vld_form.donor_knows_no_rights = request.form.get('donor_knows_no_rights')
        vld_form.donor_knows_equal_access = request.form.get('donor_knows_equal_access')
        vld_form.donor_willing_pay_taxes = request.form.get('donor_willing_pay_taxes')

        # Viability and Compliance
        vld_form.land_viable = request.form.get('land_viable')
        vld_form.provisions_relaxation_needed = request.form.get('provisions_relaxation_needed')
        vld_form.relaxation_numbers = request.form.get('relaxation_numbers')
        vld_form.rationale_for_relaxation = request.form.get('rationale_for_relaxation')
        vld_form.implications_of_relaxation = request.form.get('implications_of_relaxation')
        vld_form.mitigation_of_implications = request.form.get('mitigation_of_implications')

        # TODO: Handle file uploads if needed
        # vld_form.fard_malkiyat_file = handle_file_upload(request.files.get('fard_malkiyat_file'))
        # vld_form.affidavit_file = handle_file_upload(request.files.get('affidavit_file'))
        # etc.

        if is_draft:
            vld_form.is_draft = True
        else:
            vld_form.is_draft = False
            vld_form.submitted_at = datetime.utcnow()

            # Update case status to submitted
            case.status = 'submitted'
            case.current_stage = 'DM'
            edcs_details.is_draft = False

            # Find DM from same tehsil and assign
            dm_user = User.query.filter_by(role='DM', tehsil=current_user.tehsil).first()
            if dm_user:
                case.assigned_to_dm = dm_user.id

                # Create notification for DM
                notification = Notification(
                    case_id=case.case_id,
                    recipient_id=dm_user.id,
                    sender_id=current_user.id,
                    message=f'New VLD Checklist submitted for case {case.case_number}',
                    notification_type='NEW_CASE'
                )
                db.session.add(notification)

            # Add donor to history if provided
            if vld_form.donor_name:
                donor = DonorHistory(
                    case_id=case.case_id,
                    donor_name=vld_form.donor_name,
                    donor_cnic='',  # CNIC not in VLD form model
                    donation_type='Land',
                    land_details=f'Area: {vld_form.land_area_donated} marla, Type: {vld_form.land_type}'
                )
                db.session.add(donor)

            # Add to case history
            history = CaseHistory(
                case_id=case.case_id,
                action='FORM_SUBMITTED',
                performed_by=current_user.id,
                from_stage='EDCS',
                to_stage='DM',
                comments='VLD Checklist submitted to DM'
            )
            db.session.add(history)

        if not existing_form:
            db.session.add(vld_form)

        db.session.commit()

        message = 'VLD form draft saved!' if is_draft else 'VLD form submitted to DM!'
        return jsonify({
            'success': True,
            'message': message,
            'case_id': case.case_id if case else None,
            'case_number': case.case_number if case else None
        })

    except Exception as e:
        db.session.rollback()
        print(f"Error saving VLD form: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/edcs/state-land-option', methods=['POST'])
@login_required
def submit_state_land_option():
    if current_user.role != 'EDCS':
        flash('Access denied.', 'error')
        return redirect(url_for('dashboard'))
    
    # Get all form data
    edcs_details_id = request.form.get('edcs_details_id')
    option_number = request.form.get('option_number')
    
    # Create state land option record
    state_land_option = EDCSStateLandOption(
        edcs_details_id=int(edcs_details_id),
        option_number=int(option_number),
        state_land_available=request.form.get('state_land_available'),
        community_land_available=request.form.get('community_land_available'),
        land_type=request.form.get('land_type'),
        category_jointly_recognized=request.form.get('category_jointly_recognized'),
        land_area=safe_float_convert(request.form.get('land_area'), return_none_on_empty=True),
        ownership_allotment_name=request.form.get('ownership_allotment_name'),
        department_title=request.form.get('department_title'),
        legal_encumbrance=request.form.get('legal_encumbrance'),
        social_legal_dispute=request.form.get('social_legal_dispute'),
        mutation_allotment_possible=request.form.get('mutation_allotment_possible'),
        noc_willing_department=request.form.get('noc_willing_department'),
        revenue_dept_allows_use=request.form.get('revenue_dept_allows_use'),
        assets_value_on_land=safe_float_convert(request.form.get('assets_value_on_land'), return_none_on_empty=False),
        livelihood_impact=request.form.get('livelihood_impact'),
        relocation_involved=request.form.get('relocation_involved'),
        dc_value=safe_float_convert(request.form.get('dc_value'), return_none_on_empty=False),
        market_value=safe_float_convert(request.form.get('market_value'), return_none_on_empty=False),
        consultation_meeting=request.form.get('consultation_meeting'),
        vo_consent=request.form.get('vo_consent'),
        neighborers_consent=request.form.get('neighborers_consent'),
        grm_process_explained=request.form.get('grm_process_explained'),
        land_viable=request.form.get('land_viable'),
        provisions_relaxation_needed=request.form.get('provisions_relaxation_needed'),
        relaxation_numbers=request.form.get('relaxation_numbers'),
        rationale_for_relaxation=request.form.get('rationale_for_relaxation'),
        implications_of_relaxation=request.form.get('implications_of_relaxation'),
        mitigation_of_implications=request.form.get('mitigation_of_implications'),
        submitted_by=current_user.name
    )
    
    # Handle file uploads
    if 'fard_malkiyat_file' in request.files:
        file = request.files['fard_malkiyat_file']
        if file and file.filename != '':
            filename = secure_filename(file.filename)
            state_land_option.fard_malkiyat_file = f"uploads/{filename}"
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    
    db.session.add(state_land_option)
    db.session.commit()
    
    flash('State Land Option submitted successfully!', 'success')
    return redirect(url_for('edcs_dashboard'))

# Other role dashboards (placeholder for now)
@app.route('/dm-form')
@login_required
def dm_form():
    return render_template('DM_form.html', user=current_user)

@app.route('/bcc')
@login_required
def bcc_dashboard():
    if current_user.role != 'BCCO':
        flash('Access denied.', 'error')
        return redirect(url_for('dashboard'))
    
    # Get cases approved by DM and forwarded to BCCO from same tehsil
    # STRICT FILTER: Only show cases from same tehsil AND (assigned to current user OR not assigned yet)
    # AND not locked by another BCCO
    pending_cases = db.session.query(Case, User).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        Case.current_stage == 'BCCO',
        Case.status == 'approved',
        User.tehsil == current_user.tehsil,
        # Additional safety: Only show if assigned to current user OR not assigned to anyone
        db.or_(
            Case.assigned_to_bcc_officer == current_user.id,
            Case.assigned_to_bcc_officer == None
        ),
        # Don't show cases locked by other BCCO users
        db.or_(
            Case.reviewing_by_bcc == current_user.id,
            Case.reviewing_by_bcc == None
        )
    ).all()
    
    cases_data = []
    for case, edcs_user in pending_cases:
        # Get DM approval info
        dm_approval = CompletedRequest.query.filter_by(
            case_id=case.case_id,
            final_status='APPROVED'
        ).first()
        
        cases_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'created_at': case.created_at.strftime('%Y-%m-%d'),
            'dm_approved_at': dm_approval.completion_date.strftime('%Y-%m-%d %H:%M') if dm_approval else 'N/A',
            'dm_remarks': dm_approval.remarks if dm_approval else 'No remarks',
            'edcs_user': edcs_user.name,
            'edcs_tehsil': edcs_user.tehsil
        })
    
    # Get notifications for this BCCO (unread notifications)
    notifications = Notification.query.filter_by(
        recipient_id=current_user.id,
        is_read=False
    ).order_by(Notification.created_at.desc()).all()
    
    return render_template('BCCT.html', 
                         user=current_user, 
                         pending_cases=cases_data,
                         notifications=notifications)

@app.route('/tm')
@login_required
def tm_dashboard():
    if current_user.role != 'TM':
        flash('Access denied.', 'error')
        return redirect(url_for('dashboard'))

    # Get pending cases for TM (approved by BCCO or returned by BCCSP)
    pending_cases = db.session.query(Case, User).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        Case.current_stage == 'TM',
        db.or_(
            Case.status == 'approved_by_bcc',
            Case.status == 'returned_by_bccsp'
        ),
        db.or_(
            Case.reviewing_by_tm == None,
            Case.reviewing_by_tm == current_user.id
        )
    ).all()

    # Get notifications
    notifications = Notification.query.filter_by(
        recipient_id=current_user.id,
        is_read=False
    ).order_by(Notification.created_at.desc()).all()

    # Get stats
    from datetime import date
    today = date.today()

    # Get cases approved today by this TM
    approved_today = db.session.query(Case, CompletedRequest).join(
        CompletedRequest, Case.case_id == CompletedRequest.case_id
    ).filter(
        CompletedRequest.completed_by == current_user.id,
        CompletedRequest.final_status.in_(['APPROVED', 'APPROVED_BY_TM']),
        db.func.date(CompletedRequest.completion_date) == today
    ).all()

    # Get cases returned today by this TM
    returned_today = db.session.query(Case, ReturnedForm).join(
        ReturnedForm, Case.case_id == ReturnedForm.case_id
    ).filter(
        ReturnedForm.returned_by == current_user.id,
        ReturnedForm.stage_returned_from == 'TM',
        db.func.date(ReturnedForm.returned_at) == today
    ).all()

    # Get ALL cases returned by BCCSP to this TM (past and present)
    # This includes cases that were returned and later processed
    returned_by_bccsp = db.session.query(Case, ReturnedForm, User).join(
        ReturnedForm, Case.case_id == ReturnedForm.case_id
    ).join(
        User, ReturnedForm.returned_by == User.id
    ).filter(
        ReturnedForm.returned_to == current_user.id,
        db.or_(
            ReturnedForm.stage_returned_from == 'BCCSP',
            ReturnedForm.stage_returned_from == 'BCC_SP'
        )
    ).order_by(ReturnedForm.returned_at.desc()).all()

    # Get total donations (all cases that reached TM stage)
    total_donations = Case.query.filter(
        db.or_(
            Case.current_stage == 'TM',
            Case.current_stage == 'BCCSP',
            db.and_(
                Case.current_stage == 'COMPLETED',
                Case.status.in_(['completed', 'rejected'])
            )
        )
    ).count()

    # Get pending donations (cases currently at TM stage)
    pending_donations = len(pending_cases)

    # Get verified donations (cases approved by TM)
    verified_donations = db.session.query(CompletedRequest).filter(
        CompletedRequest.completed_by == current_user.id,
        CompletedRequest.final_status.in_(['APPROVED', 'APPROVED_BY_TM'])
    ).count()

    # Calculate total area from all cases at TM stage or beyond
    # Note: area_required_marla is the field name in EDCSUserDetails model
    total_area_result = db.session.query(
        db.func.sum(EDCSUserDetails.area_required_marla)
    ).join(
        Case, EDCSUserDetails.case_id == Case.case_id
    ).filter(
        db.or_(
            Case.current_stage == 'TM',
            Case.current_stage == 'BCCSP',
            db.and_(
                Case.current_stage == 'COMPLETED',
                Case.status == 'completed'
            )
        )
    ).scalar()

    total_area = float(total_area_result) if total_area_result else 0.0

    # Get stage-wise statistics for TM
    edcs_total = Case.query.filter(Case.current_stage == 'EDCS').count()
    dm_total = Case.query.filter(Case.current_stage == 'DM').count()
    bcco_total = Case.query.filter(Case.current_stage == 'BCCO').count()
    tm_total = Case.query.filter(Case.current_stage == 'TM').count()
    bccsp_total = Case.query.filter(Case.current_stage == 'BCCSP').count()

    # Get rejected count
    total_rejected = CompletedRequest.query.filter(
        CompletedRequest.completed_by == current_user.id,
        CompletedRequest.final_status == 'REJECTED'
    ).count()

    stats = {
        'total_donations': total_donations,
        'pending_donations': pending_donations,
        'verified_donations': verified_donations,
        'total_area': total_area,
        'pending_cases': len(pending_cases),
        'approved_today': len(approved_today),
        'returned_today': len(returned_today),
        'returned_by_bccsp_count': len(returned_by_bccsp),
        'edcs_total': edcs_total,
        'dm_total': dm_total,
        'bcco_total': bcco_total,
        'tm_total': tm_total,
        'bccsp_total': bccsp_total,
        'total_verified': verified_donations,
        'total_rejected': total_rejected,
        'pending_verification': pending_donations
    }

    return render_template('TM.html',
                         user=current_user,
                         pending_cases=pending_cases,
                         notifications=notifications,
                         stats=stats,
                         approved_today=approved_today,
                         returned_today=returned_today,
                         returned_by_bccsp=returned_by_bccsp)

@app.route('/bccsp')
@login_required
def bccsp_dashboard():
    if current_user.role != 'BCCSP':
        flash('Access denied.', 'error')
        return redirect(url_for('dashboard'))

    # Get pending cases for BCCSP (approved by TM)
    pending_cases = db.session.query(Case, User).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        Case.current_stage == 'BCCSP',
        Case.status == 'approved_by_tm',
        db.or_(
            Case.reviewing_by_bcc_specialist == None,
            Case.reviewing_by_bcc_specialist == current_user.id
        )
    ).all()

    # Get notifications
    notifications = Notification.query.filter_by(
        recipient_id=current_user.id,
        is_read=False
    ).order_by(Notification.created_at.desc()).all()

    # Calculate statistics
    total_donations = Case.query.filter(
        Case.current_stage == 'BCCSP'
    ).count()

    pending_donations = Case.query.filter(
        Case.current_stage == 'BCCSP',
        Case.status == 'approved_by_tm'
    ).count()

    verified_donations = Case.query.filter(
        Case.current_stage == 'BCCSP',
        Case.status == 'approved_by_bccsp'
    ).count()

    # Get detailed verification stats
    total_verified = CompletedRequest.query.filter(
        CompletedRequest.completed_by == current_user.id,
        CompletedRequest.final_status == 'APPROVED'
    ).count()

    total_rejected = CompletedRequest.query.filter(
        CompletedRequest.completed_by == current_user.id,
        CompletedRequest.final_status == 'REJECTED'
    ).count()

    # Get stage-wise statistics
    edcs_total = Case.query.filter(Case.current_stage == 'EDCS').count()
    dm_total = Case.query.filter(Case.current_stage == 'DM').count()
    bcco_total = Case.query.filter(Case.current_stage == 'BCCO').count()
    tm_total = Case.query.filter(Case.current_stage == 'TM').count()
    bccsp_total = Case.query.filter(Case.current_stage == 'BCCSP').count()

    # Get cases approved today
    from datetime import datetime, date
    today = date.today()
    approved_today = db.session.query(Case, CompletedRequest).join(
        CompletedRequest, Case.case_id == CompletedRequest.case_id
    ).filter(
        CompletedRequest.completed_by == current_user.id,
        CompletedRequest.final_status == 'APPROVED',
        db.func.date(CompletedRequest.completion_date) == today
    ).all()

    # Get cases returned by this BCCSP (all time, not just today)
    returned_cases = db.session.query(Case, ReturnedForm).join(
        ReturnedForm, Case.case_id == ReturnedForm.case_id
    ).filter(
        ReturnedForm.returned_by == current_user.id,
        ReturnedForm.stage_returned_from == 'BCCSP'
    ).order_by(ReturnedForm.returned_at.desc()).all()

    # Get cases returned today (for stats)
    returned_today = db.session.query(Case, ReturnedForm).join(
        ReturnedForm, Case.case_id == ReturnedForm.case_id
    ).filter(
        ReturnedForm.returned_by == current_user.id,
        ReturnedForm.stage_returned_from == 'BCCSP',
        db.func.date(ReturnedForm.returned_at) == today
    ).all()

    # Calculate total area from State Land forms
    total_area_state = db.session.query(
        db.func.sum(StateLandForm.land_area)
    ).join(
        Case, StateLandForm.case_id == Case.case_id
    ).filter(
        Case.current_stage == 'BCCSP'
    ).scalar()

    # Calculate total area from VLD forms (using area_required_marla from EDCSUserDetails)
    total_area_vld = db.session.query(
        db.func.sum(EDCSUserDetails.area_required_marla)
    ).join(
        Case, EDCSUserDetails.case_id == Case.case_id
    ).filter(
        Case.current_stage == 'BCCSP',
        Case.land_type == 'Voluntary Land Donation'
    ).scalar()

    total_area = (float(total_area_state) if total_area_state else 0.0) + (float(total_area_vld) if total_area_vld else 0.0)

    stats = {
        'total_donations': total_donations,
        'pending_cases': pending_donations,
        'verified_donations': verified_donations,
        'total_area': total_area,
        'approved_today': len(approved_today),
        'returned_today': len(returned_today),
        'total_verified': total_verified,
        'total_rejected': total_rejected,
        'pending_verification': pending_donations,
        'edcs_total': edcs_total,
        'dm_total': dm_total,
        'bcco_total': bcco_total,
        'tm_total': tm_total,
        'bccsp_total': bccsp_total
    }

    return render_template('BCCSP.html',
                         user=current_user,
                         pending_cases=pending_cases,
                         notifications=notifications,
                         stats=stats,
                         approved_today=approved_today,
                         returned_today=returned_today,
                         returned_cases=returned_cases)

@app.route('/edcs/voluntary-land-form/<int:details_id>')
@login_required
def edcs_voluntary_land_form(details_id):
    # Placeholder for voluntary land donation form
    flash('Voluntary Land Donation form coming soon!', 'info')
    return redirect(url_for('edcs_dashboard'))

@app.route('/edcs/forms')
@login_required
def get_edcs_forms():
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Get submitted cases with their forms
    submitted_cases = db.session.query(Case).filter_by(
        edcs_user_id=current_user.id,
        status='submitted'
    ).all()
    
    # Get draft cases
    draft_cases = db.session.query(Case).filter_by(
        edcs_user_id=current_user.id,
        status='draft'
    ).all()
    
    submitted_data = []
    for case in submitted_cases:
        # Get EDCS details
        edcs_details = EDCSUserDetails.query.filter_by(case_id=case.case_id).first()
        
        # Check what type of form was submitted
        form_type = 'EDCS User Details'
        if case.land_type == 'State Land':
            state_form = StateLandForm.query.filter_by(case_id=case.case_id, is_draft=False).first()
            if state_form:
                form_type = 'State Land Form'
        elif case.land_type == 'Voluntary Land Donation':
            vld_form = VLDChecklistForm.query.filter_by(case_id=case.case_id, is_draft=False).first()
            if vld_form:
                form_type = 'VLD Checklist Form'
        
        submitted_data.append({
            'id': case.case_id,
            'case_id': case.case_id,
            'form_name': case.case_number,
            'form_type': form_type,
            'land_type': case.land_type,
            'submission_date': case.created_at.strftime('%Y-%m-%d') if case.created_at else '',
            'status': case.status.title(),
            'current_stage': case.current_stage
        })
    
    draft_data = []
    for case in draft_cases:
        draft_data.append({
            'id': case.case_id,
            'case_id': case.case_id,
            'form_name': case.case_number,
            'form_type': 'EDCS User Details',
            'land_type': case.land_type,
            'last_edited': case.updated_at.strftime('%Y-%m-%d') if case.updated_at else case.created_at.strftime('%Y-%m-%d'),
            'status': 'Draft'
        })
    
    return jsonify({
        'success': True,
        'submitted': submitted_data,
        'drafts': draft_data
    })

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('login'))

def send_reset_email(user, token):
    """Send password reset email to user"""
    reset_url = url_for('reset_password', token=token, _external=True)
    
    msg = Message(
        subject='Password Reset Request - Land Donation System',
        recipients=[user.email],
        html=f'''
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #274293; color: white; padding: 20px; text-align: center;">
                <h1>Land Donation System</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
                <h2>Password Reset Request</h2>
                <p>Hello {user.name},</p>
                <p>You have requested to reset your password for your Land Donation System account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #274293; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #666;">{reset_url}</p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you did not request this password reset, please ignore this email.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 12px;">
                    This is an automated message from Land Donation System. Please do not reply to this email.
                </p>
            </div>
        </div>
        '''
    )
    
    try:
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Generate reset token
            token = user.generate_reset_token()
            
            # Send reset email
            if send_reset_email(user, token):
                flash('Password reset instructions have been sent to your email address.', 'success')
            else:
                flash('Failed to send reset email. Please try again later.', 'error')
        else:
            # Don't reveal if email exists or not for security
            flash('If that email address is in our system, you will receive password reset instructions.', 'info')
        
        return redirect(url_for('forgot_password'))
    
    return render_template('forgot_password.html')

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    user = User.query.filter_by(reset_token=token).first()
    
    if not user or not user.verify_reset_token(token):
        flash('Invalid or expired reset token.', 'error')
        return redirect(url_for('forgot_password'))
    
    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return render_template('reset_password.html', token=token)
        
        if len(password) < 6:
            flash('Password must be at least 6 characters long.', 'error')
            return render_template('reset_password.html', token=token)
        
        # Update password and clear reset token
        user.set_password(password)
        user.clear_reset_token()
        
        flash('Your password has been reset successfully. You can now login.', 'success')
        return redirect(url_for('login'))
    
    return render_template('reset_password.html', token=token)

# API endpoints
@app.route('/api/check-email')
def check_email():
    email = request.args.get('email')
    if not email:
        return jsonify({'exists': False})
    
    user = User.query.filter_by(email=email).first()
    return jsonify({'exists': user is not None})

@app.route('/edcs/state-land-form/save', methods=['POST'])
@login_required
def save_state_land_form():
    """
    Save State Land form - creates a Case when submitted (not draft).
    Links the case to the existing EDCSUserDetails record.
    """
    try:
        is_draft = request.form.get('is_draft') == 'true'
        details_id = request.form.get('details_id')  # Changed from case_id to details_id

        if not details_id:
            return jsonify({'success': False, 'message': 'User details ID is required'})

        # Get the EDCS user details
        edcs_details = EDCSUserDetails.query.filter_by(
            id=details_id,
            created_by=current_user.id
        ).first()

        if not edcs_details:
            return jsonify({'success': False, 'message': 'User details not found'})

        # Create case if it doesn't exist (for both draft and submitted)
        case = None
        if edcs_details.case_id:
            case = Case.query.get(edcs_details.case_id)

        if not case:
            # Create new case (even for drafts, since State Land form requires a case)
            year = datetime.now().year
            prefix = f"SL-{year}-"
            existing_count = Case.query.filter(Case.case_number.like(f"{prefix}%")).count()
            case_number = f"{prefix}{str(existing_count + 1).zfill(4)}"

            case = Case(
                case_number=case_number,
                edcs_user_id=current_user.id,
                land_type='State Land',
                status='draft' if is_draft else 'submitted',
                current_stage='EDCS' if is_draft else 'DM'
            )
            db.session.add(case)
            db.session.flush()  # Get case_id

            # Link case to user details
            edcs_details.case_id = case.case_id
            edcs_details.is_draft = is_draft

        # Check if form exists
        existing_form = None
        if case:
            existing_form = StateLandForm.query.filter_by(case_id=case.case_id).first()

        if existing_form:
            state_land_form = existing_form
        else:
            state_land_form = StateLandForm(
                case_id=case.case_id if case else None,
                created_by=current_user.id
            )

        # Update form fields - Basic Information
        state_land_form.option_number = int(request.form.get('option_number', 1))
        state_land_form.state_land_available = request.form.get('state_land_available')
        state_land_form.community_land_available = request.form.get('community_land_available')
        state_land_form.land_type = request.form.get('land_type')
        state_land_form.category_jointly_recognized = request.form.get('category_jointly_recognized')
        land_area_str = request.form.get('land_area', '0')
        state_land_form.land_area = float(land_area_str) if land_area_str else 0

        # Donor Information
        state_land_form.donor_name = request.form.get('donor_name')
        state_land_form.donor_cnic = request.form.get('donor_cnic')

        # Land Details
        state_land_form.land_status = request.form.get('land_status')
        state_land_form.land_use = request.form.get('land_use')
        state_land_form.land_tenure = request.form.get('land_tenure')
        state_land_form.land_ownership = request.form.get('land_ownership')
        land_value_str = request.form.get('land_value_pkr', '0')
        state_land_form.land_value_pkr = float(land_value_str) if land_value_str else 0

        # Ownership/Allotment Details
        state_land_form.ownership_allotment_name = request.form.get('ownership_allotment_name')
        state_land_form.department_title = request.form.get('department_title')

        # Legal Status
        state_land_form.legal_encumbrance = request.form.get('legal_encumbrance')
        state_land_form.social_legal_dispute = request.form.get('social_legal_dispute')
        state_land_form.mutation_possible = request.form.get('mutation_possible')
        state_land_form.department_noc_willing = request.form.get('department_noc_willing')
        state_land_form.revenue_dept_allows = request.form.get('revenue_dept_allows')

        # Financial Details
        structure_cost_str = request.form.get('structure_assets_cost', '0')
        state_land_form.structure_assets_cost = float(structure_cost_str) if structure_cost_str else 0
        state_land_form.livelihood_impact = request.form.get('livelihood_impact')
        state_land_form.relocation_involved = request.form.get('relocation_involved')
        dc_value_str = request.form.get('dc_value', '0')
        state_land_form.dc_value = float(dc_value_str) if dc_value_str else 0
        market_value_str = request.form.get('market_value', '0')
        state_land_form.market_value = float(market_value_str) if market_value_str else 0

        # Consultation and Consent
        state_land_form.consultation_meeting_conducted = request.form.get('consultation_meeting_conducted')
        state_land_form.vo_consent = request.form.get('vo_consent')
        state_land_form.neighbors_consent = request.form.get('neighbors_consent')
        state_land_form.grm_process_explained = request.form.get('grm_process_explained')

        # Viability and Compliance
        state_land_form.land_viable = request.form.get('land_viable')
        state_land_form.provisions_relaxation_needed = request.form.get('provisions_relaxation_needed')
        state_land_form.relaxation_numbers = request.form.get('relaxation_numbers')
        state_land_form.rationale_for_relaxation = request.form.get('rationale_for_relaxation')
        state_land_form.implications_of_relaxation = request.form.get('implications_of_relaxation')
        state_land_form.mitigation_of_implications = request.form.get('mitigation_of_implications')

        # TODO: Handle file uploads if needed
        # state_land_form.pdf_file = handle_file_upload(request.files.get('pdf_file'))
        # state_land_form.fard_malkiyat_file = handle_file_upload(request.files.get('fard_malkiyat_file'))
        # etc.

        if is_draft:
            state_land_form.is_draft = True
        else:
            state_land_form.is_draft = False
            state_land_form.submitted_at = datetime.utcnow()

            # Update case status to submitted
            case.status = 'submitted'
            case.current_stage = 'DM'
            edcs_details.is_draft = False

            # Find DM from same tehsil and assign
            dm_user = User.query.filter_by(role='DM', tehsil=current_user.tehsil).first()
            if dm_user:
                case.assigned_to_dm = dm_user.id

                # Create notification for DM
                notification = Notification(
                    case_id=case.case_id,
                    recipient_id=dm_user.id,
                    sender_id=current_user.id,
                    message=f'New State Land form submitted for case {case.case_number}',
                    notification_type='NEW_CASE'
                )
                db.session.add(notification)

            # Add to case history
            history = CaseHistory(
                case_id=case.case_id,
                action='FORM_SUBMITTED',
                performed_by=current_user.id,
                from_stage='EDCS',
                to_stage='DM',
                comments='State Land form submitted to DM'
            )
            db.session.add(history)

        if not existing_form:
            db.session.add(state_land_form)

        db.session.commit()

        message = 'State Land form draft saved!' if is_draft else 'State Land form submitted to DM!'
        return jsonify({
            'success': True,
            'message': message,
            'case_id': case.case_id if case else None,
            'case_number': case.case_number if case else None
        })

    except Exception as e:
        db.session.rollback()
        print(f"Error saving state land form: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/edcs/submissions')
@login_required
def edcs_submissions():
    """
    Get submitted cases (actual cases with State Land or VLD forms).
    User Details forms without cases are not counted as submissions.
    """
    if current_user.role != 'EDCS':
        return jsonify({'error': 'Unauthorized'}), 403

    # Get actual cases (those with State Land or VLD forms submitted)
    submitted_cases = Case.query.filter_by(
        edcs_user_id=current_user.id,
        status='submitted'
    ).all()

    # Get user details that are drafts (not yet converted to cases)
    draft_user_details = EDCSUserDetails.query.filter_by(
        created_by=current_user.id,
        is_draft=True,
        case_id=None
    ).all()

    submitted_data = []
    for case in submitted_cases:
        submitted_data.append({
            'id': case.case_id,
            'form_name': case.case_number,
            'land_type': case.land_type,
            'submission_date': case.created_at.strftime('%Y-%m-%d') if case.created_at else '',
            'status': case.status.title()
        })

    draft_data = []
    for details in draft_user_details:
        draft_data.append({
            'id': details.id,
            'form_name': f'User Details Draft - {details.village_name}',
            'land_type': details.land_type_selected,
            'submission_date': details.created_at.strftime('%Y-%m-%d') if details.created_at else '',
            'status': 'Draft'
        })

    return jsonify({
        'submitted': submitted_data,
        'drafts': draft_data
    })

@app.route('/edcs/returned-forms')
@login_required
def edcs_returned_forms():
    if current_user.role != 'EDCS':
        return jsonify({'error': 'Unauthorized'}), 403
    
    returned_forms = db.session.query(ReturnedForm, Case).join(
        Case, ReturnedForm.case_id == Case.case_id
    ).filter(Case.edcs_user_id == current_user.id).all()
    
    returned_data = []
    for returned_form, case in returned_forms:
        returned_data.append({
            'id': returned_form.id,
            'case_number': case.case_number,
            'form_type': case.land_type,
            'returned_by': returned_form.returned_by,
            'returned_at': returned_form.returned_at.strftime('%Y-%m-%d') if returned_form.returned_at else '',
            'reason': returned_form.reason,
            'stage': returned_form.stage_returned_from
        })
    
    return jsonify({
        'success': True,
        'returned_forms': returned_data
    })

@app.route('/edcs/completed-requests')
@login_required
def edcs_completed_requests():
    if current_user.role != 'EDCS':
        return jsonify({'error': 'Unauthorized'}), 403
    
    completed_requests = db.session.query(CompletedRequest, Case).join(
        Case, CompletedRequest.case_id == Case.case_id
    ).filter(Case.edcs_user_id == current_user.id).all()
    
    completed_data = []
    for completed_request, case in completed_requests:
        completed_data.append({
            'id': completed_request.id,
            'case_number': case.case_number,
            'form_type': case.land_type,
            'final_status': completed_request.final_status,
            'completion_date': completed_request.completion_date.strftime('%Y-%m-%d') if completed_request.completion_date else '',
            'completed_by': completed_request.completed_by,
            'remarks': completed_request.remarks
        })
    
    return jsonify({
        'success': True,
        'completed_requests': completed_data
    })

@app.route('/edcs/donor-history')
@login_required
def edcs_donor_history():
    if current_user.role != 'EDCS':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Get donor history for current EDCS user's cases
    donor_history = db.session.query(DonorHistory, Case).join(
        Case, DonorHistory.case_id == Case.case_id
    ).filter(Case.edcs_user_id == current_user.id).all()
    
    donor_data = []
    for donor, case in donor_history:
        donor_data.append({
            'id': donor.id,
            'case_number': case.case_number,
            'donor_name': donor.donor_name,
            'donor_cnic': donor.donor_cnic,
            'donation_type': donor.donation_type,
            'donation_amount': donor.donation_amount,
            'donated_at': donor.donated_at.strftime('%Y-%m-%d') if donor.donated_at else '',
            'land_details': donor.land_details,
            'remarks': donor.remarks
        })
    
    return jsonify({
        'success': True,
        'donor_history': donor_data
    })

@app.route('/edcs/verification-summary')
@login_required
def edcs_verification_summary():
    if current_user.role != 'EDCS':
        return jsonify({'error': 'Unauthorized'}), 403
    
    verification_summaries = db.session.query(VerificationSummary, Case).join(
        Case, VerificationSummary.case_id == Case.case_id
    ).filter(Case.edcs_user_id == current_user.id).all()
    
    verification_data = []
    for verification, case in verification_summaries:
        verification_data.append({
            'id': verification.id,
            'case_number': case.case_number,
            'verification_status': verification.verification_status,
            'verification_date': verification.verification_date.strftime('%Y-%m-%d') if verification.verification_date else '',
            'verified_by': verification.verified_by,
            'summary': verification.summary,
            'stage': verification.stage
        })
    
    return jsonify({
        'success': True,
        'verification_summary': verification_data
    })

@app.route('/edcs/download-report/<case_number>')
@login_required
def download_report(case_number):
    if current_user.role != 'EDCS':
        flash('Access denied.', 'error')
        return redirect(url_for('dashboard'))
    
    # For now, return a simple response - you can implement actual PDF generation later
    return jsonify({'success': True, 'message': f'Report for {case_number} would be downloaded'})

@app.route('/edcs/export/returned-forms/<format>')
@login_required
def export_returned_forms(format):
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # For now, return a simple response - you can implement actual export later
    return jsonify({'success': True, 'message': f'Returned forms exported as {format}'})

@app.route('/edcs/export/completed-requests/<format>')
@login_required
def export_completed_requests(format):
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # For now, return a simple response - you can implement actual export later
    return jsonify({'success': True, 'message': f'Completed requests exported as {format}'})

@app.route('/edcs/load-draft/user-details/<int:form_id>')
@login_required
def load_edcs_draft(form_id):
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    edcs_details = EDCSUserDetails.query.filter_by(
        id=form_id,
        created_by=current_user.id
    ).first()
    
    if not edcs_details:
        return jsonify({'success': False, 'message': 'Draft not found'})
    
    return jsonify({
        'success': True,
        'form_data': {
            'consultant_name': edcs_details.consultant_name,
            'region': edcs_details.region,
            'form_filling_date': edcs_details.form_filling_date.strftime('%Y-%m-%d'),
            'village_name': edcs_details.village_name,
            'settlement_name': edcs_details.settlement_name,
            'scheme_interventions': edcs_details.scheme_interventions,
            'land_proposed_for': edcs_details.land_proposed_for,
            'area_required_marla': str(edcs_details.area_required_marla),
            'options_identified': edcs_details.options_identified,
            'land_type_selected': edcs_details.land_type_selected
        }
    })

@app.route('/edcs/load-draft/state-land/<int:form_id>')
@login_required
def load_state_land_draft(form_id):
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    state_form = StateLandForm.query.filter_by(
        id=form_id,
        created_by=current_user.id
    ).first()
    
    if not state_form:
        return jsonify({'success': False, 'message': 'Draft not found'})
    
    return jsonify({
        'success': True,
        'form_data': {
            'option_number': state_form.option_number,
            'state_land_available': state_form.state_land_available,
            'community_land_available': state_form.community_land_available,
            'land_type': state_form.land_type,
            'category_jointly_recognized': state_form.category_jointly_recognized,
            'land_area': str(state_form.land_area) if state_form.land_area else '',
            'ownership_allotment_name': state_form.ownership_allotment_name,
            'department_title': state_form.department_title,
            'legal_encumbrance': state_form.legal_encumbrance,
            'social_legal_dispute': state_form.social_legal_dispute,
            'land_viable': state_form.land_viable,
            'provisions_relaxation_needed': state_form.provisions_relaxation_needed,
            'relaxation_numbers': state_form.relaxation_numbers,
            'rationale_for_relaxation': state_form.rationale_for_relaxation,
            'implications_of_relaxation': state_form.implications_of_relaxation,
            'mitigation_of_implications': state_form.mitigation_of_implications
        }
    })

@app.route('/edcs/view/user-details/<int:form_id>')
@login_required
def view_edcs_details(form_id):
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    edcs_details = EDCSUserDetails.query.filter_by(
        id=form_id,
        created_by=current_user.id
    ).first()
    
    if not edcs_details:
        return jsonify({'success': False, 'message': 'Form not found'})
    
    return jsonify({
        'success': True,
        'form_data': {
            'Consultant Name': edcs_details.consultant_name,
            'Region': edcs_details.region,
            'Form Filling Date': edcs_details.form_filling_date.strftime('%Y-%m-%d'),
            'Village Name': edcs_details.village_name,
            'Settlement Name': edcs_details.settlement_name,
            'Scheme Interventions': edcs_details.scheme_interventions,
            'Land Proposed For': edcs_details.land_proposed_for,
            'Area Required (Marla)': str(edcs_details.area_required_marla),
            'Options Identified': edcs_details.options_identified,
            'Land Type Selected': edcs_details.land_type_selected
        }
    })

@app.route('/edcs/resume/<int:form_id>')
@login_required
def edcs_resume_form(form_id):
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Get the draft form details
    form_details = EDCSUserDetails.query.filter_by(
        id=form_id,
        created_by=current_user.id
    ).first()
    
    if not form_details:
        return jsonify({'success': False, 'message': 'Draft not found'})
    
    return jsonify({
        'success': True,
        'form_data': {
            'consultant_name': form_details.consultant_name or '',
            'region': form_details.region or '',
            'form_filling_date': form_details.form_filling_date.strftime('%Y-%m-%d') if form_details.form_filling_date else '',
            'village_name': form_details.village_name or '',
            'settlement_name': form_details.settlement_name or '',
            'scheme_interventions': form_details.scheme_interventions or '',
            'land_proposed_for': form_details.land_proposed_for or '',
            'area_required_marla': str(form_details.area_required_marla) if form_details.area_required_marla else '',
            'options_identified': form_details.options_identified or '',
            'land_type_selected': form_details.land_type_selected or ''
        },
        'case_id': form_details.case_id,
        'form_id': form_details.id
    })

@app.route('/edcs/view-submitted/<int:form_id>')
@login_required
def edcs_view_submitted(form_id):
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Get the submitted form details
    form_details = EDCSUserDetails.query.filter_by(
        id=form_id,
        created_by=current_user.id
    ).first()
    
    if not form_details:
        return jsonify({'success': False, 'message': 'Form not found'})
    
    # Get associated options using case_id
    state_options = StateLandForm.query.filter_by(case_id=form_details.case_id).all()
    vld_options = VLDChecklistForm.query.filter_by(case_id=form_details.case_id).all()
    total_options = len(state_options) + len(vld_options)
    
    return jsonify({
        'success': True,
        'form_data': {
            'consultant_name': form_details.consultant_name,
            'region': form_details.region,
            'form_filling_date': form_details.form_filling_date.strftime('%Y-%m-%d'),
            'village_name': form_details.village_name,
            'settlement_name': form_details.settlement_name,
            'scheme_interventions': form_details.scheme_interventions,
            'land_proposed_for': form_details.land_proposed_for,
            'area_required_marla': str(form_details.area_required_marla),
            'land_pledged': form_details.land_pledged,
            'donor_willing_mutation': form_details.donor_willing_mutation,
            'land_leased': form_details.land_leased,
            'holdings_more_2_kanal': form_details.holdings_more_2_kanal,
            'holdings_more_25_kanal': form_details.holdings_more_25_kanal,
            'donation_percentage': str(form_details.donation_percentage),
            'donor_knows_no_rights': form_details.donor_knows_no_rights,
            'donor_knows_equal_access': form_details.donor_knows_equal_access,
            'donor_willing_pay_taxes': form_details.donor_willing_pay_taxes,
            'provisions_relaxation_needed': form_details.provisions_relaxation_needed,
            'relaxation_numbers': form_details.relaxation_numbers,
            'rationale_for_relaxation': form_details.rationale_for_relaxation,
            'implications_of_relaxation': form_details.implications_of_relaxation,
            'mitigation_of_implications': form_details.mitigation_of_implications
        }
    })

@app.route('/dm/debug-data')
@login_required
def dm_debug_data():
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Get all cases
    all_cases = Case.query.all()
    
    # Get cases assigned to this DM
    dm_cases = Case.query.filter_by(assigned_to_dm=current_user.id).all()
    
    # Get cases in DM stage from same tehsil
    dm_stage_cases = db.session.query(Case, User).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        Case.current_stage == 'DM',
        User.tehsil == current_user.tehsil
    ).all()
    
    # Get submitted cases from same tehsil
    submitted_cases = db.session.query(Case, User).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        Case.status == 'submitted',
        User.tehsil == current_user.tehsil
    ).all()
    
    return jsonify({
        'success': True,
        'current_user_id': current_user.id,
        'current_user_role': current_user.role,
        'current_user_tehsil': current_user.tehsil,
        'total_cases': len(all_cases),
        'cases_assigned_to_dm': len(dm_cases),
        'cases_in_dm_stage_same_tehsil': len(dm_stage_cases),
        'submitted_cases_same_tehsil': len(submitted_cases),
        'dm_stage_cases_details': [
            {
                'case_id': case.case_id,
                'case_number': case.case_number,
                'edcs_tehsil': user.tehsil,
                'edcs_name': user.name
            } for case, user in dm_stage_cases
        ]
    })

@app.route('/dm/assign-cases-to-dm', methods=['POST'])
@login_required
def assign_cases_to_dm():
    """Assign submitted cases from same tehsil to current DM for testing"""
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Find submitted cases from EDCS users in same tehsil that aren't assigned to any DM
    unassigned_cases = db.session.query(Case).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        Case.status == 'submitted',
        Case.assigned_to_dm == None,
        User.tehsil == current_user.tehsil
    ).all()
    
    assigned_count = 0
    for case in unassigned_cases:
        case.assigned_to_dm = current_user.id
        case.current_stage = 'DM'
        assigned_count += 1
    
    db.session.commit()
    
    return jsonify({
        'success': True, 
        'message': f'Assigned {assigned_count} cases from {current_user.tehsil} tehsil to current DM',
        'assigned_cases': assigned_count,
        'tehsil': current_user.tehsil
    })

@app.route('/dm/assign-cases', methods=['POST'])
@login_required
def assign_cases():
    """Route that matches the frontend call"""
    return assign_cases_to_dm()

@app.route('/dm/dashboard-stats')
@login_required
def dm_dashboard_stats():
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    from datetime import datetime, date
    
    # Get pending cases count - only from same tehsil (include returned_by_bcco, exclude rejected_by_bcco)
    pending_count = db.session.query(Case).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        Case.current_stage == 'DM',
        Case.status.in_(['submitted', 'reviewing_by_dm', 'returned_by_bcco']),  # Include returned_by_bcco, exclude rejected_by_bcco
        db.or_(
            Case.reviewing_by_dm == None,
            Case.reviewing_by_dm == current_user.id
        ),
        User.tehsil == current_user.tehsil
    ).count()
    
    # Get unread notifications count
    notification_count = Notification.query.filter_by(
        recipient_id=current_user.id,
        is_read=False
    ).count()
    
    # Get approved cases today
    today = date.today()
    approved_today = 0
    returned_today = 0
    
    try:
        # Try to query CaseHistory table
        approved_today = db.session.query(CaseHistory).filter(
            CaseHistory.performed_by == current_user.id,
            CaseHistory.action == 'DM_APPROVED',
            db.func.date(CaseHistory.created_at) == today
        ).count()
        
        returned_today = db.session.query(CaseHistory).filter(
            CaseHistory.performed_by == current_user.id,
            CaseHistory.action == 'DM_RETURNED',
            db.func.date(CaseHistory.created_at) == today
        ).count()
    except Exception as e:
        print(f"CaseHistory table error: {e}")
        # Fallback: count from ReturnedForm and CompletedRequest tables
        try:
            returned_today = db.session.query(ReturnedForm).filter(
                ReturnedForm.returned_by == current_user.id,
                db.func.date(ReturnedForm.returned_at) == today
            ).count()
            
            approved_today = db.session.query(CompletedRequest).filter(
                CompletedRequest.completed_by == current_user.id,
                CompletedRequest.final_status == 'APPROVED',
                db.func.date(CompletedRequest.completion_date) == today
            ).count()
        except Exception as e2:
            print(f"Fallback query error: {e2}")
    
    return jsonify({
        'success': True,
        'stats': {
            'pending_count': pending_count,
            'notification_count': notification_count,
            'approved_today': approved_today,
            'returned_today': returned_today
        }
    })

@app.route('/dm/debug-stats')
@login_required
def dm_debug_stats():
    if current_user.role != 'DM':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from datetime import date
    
    # Check table existence
    tables_exist = {}
    try:
        tables_exist['CaseHistory'] = db.session.query(CaseHistory).first() is not None or True
    except:
        tables_exist['CaseHistory'] = False
    
    try:
        tables_exist['ReturnedForm'] = db.session.query(ReturnedForm).first() is not None or True
    except:
        tables_exist['ReturnedForm'] = False
    
    try:
        tables_exist['CompletedRequest'] = db.session.query(CompletedRequest).first() is not None or True
    except:
        tables_exist['CompletedRequest'] = False
    
    # Get counts
    pending_count = Case.query.filter_by(assigned_to_dm=current_user.id, current_stage='DM').count()
    returned_today = ReturnedForm.query.filter(
        ReturnedForm.returned_at >= date.today()
    ).count()
    approved_today = CompletedRequest.query.filter(
        CompletedRequest.completed_at >= date.today()
    ).count()
    
    return jsonify({
        'current_user_id': current_user.id,
        'today': date.today().isoformat(),
        'tables_exist': tables_exist,
        'counts': {
            'pending_cases': pending_count,
            'returned_today': returned_today,
            'approved_today': approved_today
        }
    })

@app.route('/dm/notifications-data')
@login_required
def dm_notifications_data():
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        notifications = Notification.query.filter_by(
            recipient_id=current_user.id
        ).order_by(Notification.created_at.desc()).limit(10).all()
        
        notifications_data = []
        for notif in notifications:
            notifications_data.append({
                'id': notif.id,
                'message': notif.message,
                'type': notif.notification_type,
                'created_at': notif.created_at.strftime('%Y-%m-%d %H:%M'),
                'is_read': notif.is_read
            })
        
        return jsonify({
            'success': True,
            'notifications': notifications_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/bcc/save-checklist-responses', methods=['POST'])
@login_required
def bcc_save_checklist_responses():
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        data = request.get_json()
        case_id = data.get('case_id')
        bcc_responses = data.get('bcc_responses', [])
        
        print(f"DEBUG: Received case_id: {case_id}")
        print(f"DEBUG: Received bcc_responses: {bcc_responses}")
        
        if not case_id:
            return jsonify({'success': False, 'message': 'Case ID is required'})
        
        case = Case.query.get_or_404(case_id)
        print(f"DEBUG: Found case: {case.case_number}")
        
        # Check if case is available for review
        if case.reviewing_by_bcc and case.reviewing_by_bcc != current_user.id:
            reviewing_bcc = User.query.get(case.reviewing_by_bcc)
            return jsonify({
                'success': False, 
                'message': f'Case is currently being reviewed by {reviewing_bcc.name}'
            })
        
        # Set case as being reviewed by current BCC Officer
        case.reviewing_by_bcc = current_user.id
        print(f"DEBUG: Set reviewing_by_bcc to: {current_user.id}")
        
        # Delete existing BCC checklist responses for this case to avoid duplicates
        deleted_count = BCCChecklist.query.filter_by(case_id=case_id).delete()
        print(f"DEBUG: Deleted {deleted_count} existing BCC responses")
        
        # Save each BCC response
        saved_count = 0
        for response in bcc_responses:
            question_num = response.get('question_number')
            bcc_resp = response.get('bcc_response')
            bcc_remarks = response.get('bcc_remarks')
            
            print(f"DEBUG: Processing question {question_num}: response={bcc_resp}, remarks={bcc_remarks}")
            
            if question_num and (bcc_resp or bcc_remarks):
                new_response = BCCChecklist(
                    case_id=int(case_id),
                    question_number=question_num,
                    bcc_response=bcc_resp,
                    bcc_remarks=bcc_remarks,
                    created_by=current_user.id
                )
                db.session.add(new_response)
                saved_count += 1
                print(f"DEBUG: Added BCC response {question_num}")
        
        print(f"DEBUG: Total responses to save: {saved_count}")
        
        # Add to case history
        history = CaseHistory(
            case_id=case.case_id,
            action='BCC_CHECKLIST_SAVED',
            performed_by=current_user.id,
            from_stage='BCC_OFFICER',
            to_stage='BCC_OFFICER',
            comments=f'BCC checklist saved for case {case.case_number} - Case now under review by {current_user.name}'
        )
        db.session.add(history)
        print("DEBUG: Added case history")
        
        db.session.commit()
        print("DEBUG: Successfully committed to database")
        

        return jsonify({'success': True, 'message': f'BCC Checklist saved successfully - {saved_count} responses saved'})
        
    except Exception as e:
        db.session.rollback()
        print(f"DEBUG: Error occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error saving checklist: {str(e)}'})

@app.route('/bcc/process-case', methods=['POST'])
@login_required
def bcc_process_case():
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        case_id = request.form.get('case_id')
        action = request.form.get('action')
        remarks = request.form.get('remarks', '')

        case = Case.query.get_or_404(case_id)

        # Check if case is being reviewed by current BCC Officer
        if case.reviewing_by_bcc and case.reviewing_by_bcc != current_user.id:
            reviewing_bcc = User.query.get(case.reviewing_by_bcc)
            return jsonify({
                'success': False,
                'message': f'Case is currently being reviewed by {reviewing_bcc.name}'
            })

        # Get existing BCC checklist responses for this case
        bcc_checklist_responses = BCCChecklist.query.filter_by(case_id=case_id).all()
        checklist_summary = ""
        if bcc_checklist_responses:
            checklist_summary = f" BCC Checklist: {len(bcc_checklist_responses)} items reviewed."

        if action == 'approve':
            # Forward to TM instead of COMPLETED
            case.current_stage = 'TM'
            case.status = 'approved_by_bcc'
            case.reviewing_by_bcc = None  # Clear reviewing status

            # Find TM from same tehsil
            tm_user = User.query.filter_by(role='TM', tehsil=current_user.tehsil).first()
            if tm_user:
                case.assigned_to_tm = tm_user.id

                # Create notification for TM
                notification = Notification(
                    case_id=case.case_id,
                    recipient_id=tm_user.id,
                    sender_id=current_user.id,
                    message=f'Case {case.case_number} approved by BCC Officer {current_user.name} and forwarded for review',
                    notification_type='FORWARDED'
                )
                db.session.add(notification)

            # Record BCC approval in completed requests
            completed_request = CompletedRequest(
                case_id=case.case_id,
                completed_by=current_user.id,
                final_status='APPROVED_BY_BCC',
                remarks=f'Approved by BCC Officer {current_user.name}: {remarks}{checklist_summary}',
                completion_date=datetime.utcnow()
            )
            db.session.add(completed_request)

            history = CaseHistory(
                case_id=case.case_id,
                action='BCC_APPROVED',
                performed_by=current_user.id,
                from_stage='BCCO',
                to_stage='TM',
                comments=f'BCC Officer {current_user.name} approved and forwarded to TM. Remarks: {remarks}{checklist_summary}'
            )

        elif action == 'reject':
            case.status = 'rejected_by_bcco'
            case.current_stage = 'DM'  # Send back to DM for review
            case.reviewing_by_bcc = None  # Clear reviewing status
            case.assigned_to_bcc_officer = None

            # Add to returned_forms so it appears in DM Review
            returned_form = ReturnedForm(
                case_id=case.case_id,
                returned_by=current_user.id,
                returned_to=case.assigned_to_dm,
                reason=f'REJECTED: {remarks}{checklist_summary}',
                stage_returned_from='BCCO',
                returned_at=datetime.utcnow()
            )
            db.session.add(returned_form)

            # Also add to completed_request for BCCO's records
            completed_request = CompletedRequest(
                case_id=case.case_id,
                completed_by=current_user.id,
                final_status='REJECTED',
                remarks=f'Rejected by BCC Officer {current_user.name}: {remarks}{checklist_summary}',
                completion_date=datetime.utcnow()
            )
            db.session.add(completed_request)

            # Notify DM
            notification = Notification(
                case_id=case.case_id,
                recipient_id=case.assigned_to_dm,
                sender_id=current_user.id,
                message=f'Case {case.case_number} rejected by BCC Officer',
                notification_type='REJECTED'
            )
            db.session.add(notification)

            history = CaseHistory(
                case_id=case.case_id,
                action='BCC_REJECTED',
                performed_by=current_user.id,
                from_stage='BCCO',
                to_stage='DM',
                comments=f'BCC Officer {current_user.name} rejected the case. Remarks: {remarks}{checklist_summary}'
            )

        elif action == 'return':
            case.current_stage = 'DM'
            case.status = 'returned_by_bcco'  # Changed from 'submitted' to 'returned_by_bcco'
            case.reviewing_by_bcc = None  # Clear reviewing status
            case.assigned_to_bcc_officer = None

            returned_form = ReturnedForm(
                case_id=case.case_id,
                returned_by=current_user.id,
                returned_to=case.assigned_to_dm,
                reason=f'RETURNED: {remarks}{checklist_summary}',
                stage_returned_from='BCCO',
                returned_at=datetime.utcnow()
            )
            db.session.add(returned_form)

            notification = Notification(
                case_id=case.case_id,
                recipient_id=case.assigned_to_dm,
                sender_id=current_user.id,
                message=f'Case {case.case_number} returned by BCC Officer for revision',
                notification_type='RETURNED'
            )
            db.session.add(notification)

            history = CaseHistory(
                case_id=case.case_id,
                action='BCC_RETURNED',
                performed_by=current_user.id,
                from_stage='BCCO',
                to_stage='DM',
                comments=f'BCC Officer {current_user.name} returned to DM for revision. Remarks: {remarks}{checklist_summary}'
            )

        db.session.add(history)
        db.session.commit()

        return jsonify({'success': True, 'message': f'Case {action}d successfully'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/bcc/check-case-availability/<int:case_id>')
@login_required
def bcc_check_case_availability(case_id):
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})

    case = Case.query.get_or_404(case_id)

    if case.reviewing_by_bcc and case.reviewing_by_bcc != current_user.id:
        reviewing_bcc = User.query.get(case.reviewing_by_bcc)
        return jsonify({
            'available': False,
            'reviewing_by': reviewing_bcc.name if reviewing_bcc else 'Unknown BCC Officer'
        })

    return jsonify({'available': True})

@app.route('/bcc/unlock-case/<int:case_id>', methods=['POST'])
@login_required
def bcc_unlock_case(case_id):
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        case = Case.query.get_or_404(case_id)

        # Only unlock if current user is the one who locked it
        if case.reviewing_by_bcc == current_user.id:
            case.reviewing_by_bcc = None
            db.session.commit()
            return jsonify({'success': True})

        return jsonify({'success': False, 'message': 'Case not locked by you'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

def get_time_ago(datetime_obj):
    """Helper function to get human readable time difference"""
    now = datetime.utcnow()
    diff = now - datetime_obj
    
    if diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "Just now"

@app.route('/dm/mark-all-notifications-read', methods=['POST'])
@login_required
def mark_all_notifications_read():
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Mark all notifications as read for current user
    Notification.query.filter_by(
        recipient_id=current_user.id,
        is_read=False
    ).update({'is_read': True})
    
    db.session.commit()
    return jsonify({'success': True, 'message': 'All notifications marked as read'})

@app.route('/edcs/debug-data')
@login_required
def edcs_debug_data():
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    debug_info = {
        'current_user_id': current_user.id,
        'tables_exist': {},
        'counts': {},
        'sample_data': {}
    }
    
    # Check cases for this user
    cases = Case.query.filter_by(edcs_user_id=current_user.id).all()
    debug_info['user_cases'] = [{'case_id': c.case_id, 'case_number': c.case_number} for c in cases]
    debug_info['counts']['user_cases'] = len(cases)
    
    case_ids = [c.case_id for c in cases]
    
    # Check each table
    try:
        returned_forms = ReturnedForm.query.filter(ReturnedForm.case_id.in_(case_ids)).all()
        debug_info['tables_exist']['ReturnedForm'] = True
        debug_info['counts']['returned_forms'] = len(returned_forms)
        
        # Get sample data for the first returned form
        if returned_forms:
            sample_returned_form = returned_forms[0]
            debug_info['sample_data']['ReturnedForm'] = {
                'case_id': sample_returned_form.case_id,
                'returned_by': sample_returned_form.returned_by,
                'returned_to': sample_returned_form.returned_to,
                'reason': sample_returned_form.reason,
                'stage_returned_from': sample_returned_form.stage_returned_from
            }
        
    except Exception as e:
        debug_info['tables_exist']['ReturnedForm'] = False
        debug_info['returned_form_error'] = str(e)
    
    try:
        completed_requests = CompletedRequest.query.filter(CompletedRequest.case_id.in_(case_ids)).all()
        debug_info['tables_exist']['CompletedRequest'] = True
        debug_info['counts']['completed_requests'] = len(completed_requests)
        
        # Get sample data for the first completed request
        if completed_requests:
            sample_completed = completed_requests[0]
            debug_info['sample_data']['CompletedRequest'] = {
                'case_id': sample_completed.case_id,
                'completed_by': sample_completed.completed_by,
                'final_status': sample_completed.final_status,
                'completion_date': sample_completed.completion_date.isoformat() if sample_completed.completion_date else None
            }
            
    except Exception as e:
        debug_info['tables_exist']['CompletedRequest'] = False
        debug_info['completed_request_error'] = str(e)
    
    return jsonify(debug_info)

@app.route('/dm/save-checklist-responses', methods=['POST'])
@login_required
def dm_save_checklist_responses():
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        data = request.get_json()
        case_id = data.get('case_id')
        dm_responses = data.get('dm_responses', [])
        
        case = Case.query.get_or_404(case_id)
        
        # Check if case is available for review
        if case.reviewing_by_dm and case.reviewing_by_dm != current_user.id:
            reviewing_dm = User.query.get(case.reviewing_by_dm)
            return jsonify({
                'success': False, 
                'message': f'Case is currently being reviewed by {reviewing_dm.name}'
            })
        
        # Set case as being reviewed by current DM
        case.reviewing_by_dm = current_user.id
        
        # Delete existing DM checklist responses for this case to avoid duplicates
        DMChecklist.query.filter_by(case_id=case_id).delete()
        
        # Save each DM response with proper question text
        questions = [
            "Is the land type correctly identified?",
            "Are all required documents submitted?",
            "Is the land area calculation accurate?",
            "Are GPS coordinates provided and verified?",
            "Is donor consent properly documented?",
            "Are neighbors' consents obtained?",
            "Is the land viable for the proposed use?",
            "Are all legal requirements met?",
            "Is the consultation process complete?",
            "Are there any conflicts or disputes?"
        ]
        
        for response in dm_responses:
            question_num = response.get('question_number')
            dm_resp = response.get('dm_response')
            dm_remarks = response.get('dm_remarks')
            
            if question_num and (dm_resp or dm_remarks):
                question_text = questions[question_num - 1] if question_num <= len(questions) else f'Question {question_num}'
                
                new_response = DMChecklist(
                    case_id=int(case_id),
                    question_number=question_num,
                    question_text=question_text,
                    dm_response=dm_resp,
                    dm_remarks=dm_remarks,
                    created_by=current_user.id
                )
                db.session.add(new_response)
        
        # Add to case history
        history = CaseHistory(
            case_id=case.case_id,
            action='DM_CHECKLIST_SAVED',
            performed_by=current_user.id,
            from_stage='DM',
            to_stage='DM',
            comments=f'DM checklist saved for case {case.case_number} - Case now under review by {current_user.name}'
        )
        db.session.add(history)
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'DM Checklist saved successfully - Case now under your review'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error saving checklist: {str(e)}'})

@app.route('/bcco/dashboard-stats')
@login_required
def bcco_dashboard_stats():
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    from datetime import datetime, date
    
    # Get pending cases count - only approved by DMs from same tehsil
    pending_count = db.session.query(Case).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        Case.current_stage == 'BCCO',
        Case.status == 'approved',
        User.tehsil == current_user.tehsil
    ).count()
    
    # Get unread notifications count
    notification_count = Notification.query.filter_by(
        recipient_id=current_user.id,
        is_read=False
    ).count()
    
    # Get approved cases today
    today = date.today()
    approved_today = 0
    returned_today = 0
    
    try:
        approved_today = db.session.query(CompletedRequest).filter(
            CompletedRequest.completed_by == current_user.id,
            CompletedRequest.final_status.in_(['APPROVED', 'APPROVED_BY_BCC']),
            db.func.date(CompletedRequest.completion_date) == today
        ).count()

        returned_today = db.session.query(ReturnedForm).filter(
            ReturnedForm.returned_by == current_user.id,
            db.func.date(ReturnedForm.returned_at) == today
        ).count()
    except Exception as e:
        print(f"Error querying stats: {e}")
    
    return jsonify({
        'success': True,
        'stats': {
            'pending_count': pending_count,
            'notification_count': notification_count,
            'approved_today': approved_today,
            'returned_today': returned_today
        }
    })

@app.route('/bcco/my-submissions')
@login_required
def bcco_my_submissions():
    if current_user.role != 'BCCO':
        return jsonify({'error': 'Unauthorized'}), 403

    # Get all cases processed by this BCCO
    processed_cases = db.session.query(Case, CompletedRequest, User).join(
        CompletedRequest, Case.case_id == CompletedRequest.case_id
    ).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        CompletedRequest.completed_by == current_user.id,
        User.tehsil == current_user.tehsil
    ).order_by(CompletedRequest.completion_date.desc()).all()

    # Get returned cases by this BCCO
    returned_cases = db.session.query(Case, ReturnedForm, User).join(
        ReturnedForm, Case.case_id == ReturnedForm.case_id
    ).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        ReturnedForm.returned_by == current_user.id,
        User.tehsil == current_user.tehsil
    ).order_by(ReturnedForm.returned_at.desc()).all()

    # Get cases returned or rejected by TM to this BCCO
    tm_returned_cases = db.session.query(Case, ReturnedForm, User).join(
        ReturnedForm, Case.case_id == ReturnedForm.case_id
    ).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        ReturnedForm.returned_to == current_user.id,
        ReturnedForm.stage_returned_from == 'TM'
    ).order_by(ReturnedForm.returned_at.desc()).all()

    submissions_data = []

    # Add processed cases (approved/rejected)
    for case, completed_request, edcs_user in processed_cases:
        # Get DM user
        dm_user = User.query.get(case.assigned_to_dm) if case.assigned_to_dm else None

        submissions_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_user': edcs_user.name,
            'dm_user': dm_user.name if dm_user else 'N/A',
            'action_date': completed_request.completion_date.strftime('%Y-%m-%d %H:%M'),
            'status': completed_request.final_status,
            'remarks': completed_request.remarks,
            'type': 'processed'
        })

    # Add returned cases by BCCO
    for case, returned_form, edcs_user in returned_cases:
        # Get DM user
        dm_user = User.query.get(case.assigned_to_dm) if case.assigned_to_dm else None

        submissions_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_user': edcs_user.name,
            'dm_user': dm_user.name if dm_user else 'N/A',
            'action_date': returned_form.returned_at.strftime('%Y-%m-%d %H:%M'),
            'status': 'RETURNED',
            'remarks': returned_form.reason,
            'type': 'returned'
        })

    # Add cases returned/rejected by TM
    for case, returned_form, edcs_user in tm_returned_cases:
        # Get DM user
        dm_user = User.query.get(case.assigned_to_dm) if case.assigned_to_dm else None

        submissions_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_user': edcs_user.name,
            'dm_user': dm_user.name if dm_user else 'N/A',
            'action_date': returned_form.returned_at.strftime('%Y-%m-%d %H:%M'),
            'status': 'RETURNED_BY_TM',
            'remarks': returned_form.reason,
            'type': 'returned_by_tm'
        })

    # Sort by action date (most recent first)
    submissions_data.sort(key=lambda x: x['action_date'], reverse=True)

    return jsonify({
        'success': True,
        'submissions': submissions_data
    })

@app.route('/dm/check-case-availability/<int:case_id>')
@login_required
def dm_check_case_availability(case_id):
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        case = Case.query.get(case_id)
        if not case:
            return jsonify({'success': False, 'message': 'Case not found'})

        if case.reviewing_by_dm and case.reviewing_by_dm != current_user.id:
            reviewing_dm = User.query.get(case.reviewing_by_dm)
            return jsonify({
                'available': False,
                'reviewing_by': reviewing_dm.name if reviewing_dm else 'Unknown DM'
            })

        return jsonify({'available': True})

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error checking case availability: {str(e)}'})

@app.route('/dm/unlock-case/<int:case_id>', methods=['POST'])
@login_required
def dm_unlock_case(case_id):
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        case = Case.query.get_or_404(case_id)

        # Only unlock if current user is the one who locked it
        if case.reviewing_by_dm == current_user.id:
            case.reviewing_by_dm = None
            db.session.commit()
            return jsonify({'success': True})

        return jsonify({'success': False, 'message': 'Case not locked by you'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/dm/my-submissions')
@login_required
def dm_my_submissions():
    if current_user.role != 'DM':
        return jsonify({'error': 'Unauthorized'}), 403

    # Get all cases processed by this DM
    processed_cases = db.session.query(Case, CompletedRequest, User).join(
        CompletedRequest, Case.case_id == CompletedRequest.case_id
    ).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        CompletedRequest.completed_by == current_user.id
    ).order_by(CompletedRequest.completion_date.desc()).all()

    # Get returned cases by this DM
    returned_cases = db.session.query(Case, ReturnedForm, User).join(
        ReturnedForm, Case.case_id == ReturnedForm.case_id
    ).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        ReturnedForm.returned_by == current_user.id
    ).order_by(ReturnedForm.returned_at.desc()).all()

    # Get cases returned or rejected by BCCO to this DM
    bcco_returned_cases = db.session.query(Case, ReturnedForm, User).join(
        ReturnedForm, Case.case_id == ReturnedForm.case_id
    ).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        ReturnedForm.returned_to == current_user.id,
        db.or_(
            ReturnedForm.stage_returned_from == 'BCCO',
            ReturnedForm.stage_returned_from == 'BCC_OFFICER'
        )
    ).order_by(ReturnedForm.returned_at.desc()).all()

    submissions_data = []

    # Add processed cases (approved/rejected)
    for case, completed_request, edcs_user in processed_cases:
        # Change "APPROVED" to "FORWARDED_TO_BCCO" for better clarity
        display_status = completed_request.final_status
        if display_status == 'APPROVED':
            display_status = 'FORWARDED_TO_BCCO'

        submissions_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_user': edcs_user.name,
            'action_date': completed_request.completion_date.strftime('%Y-%m-%d %H:%M'),
            'status': display_status,
            'remarks': completed_request.remarks,
            'type': 'processed'
        })

    # Add returned cases by DM
    for case, returned_form, edcs_user in returned_cases:
        submissions_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_user': edcs_user.name,
            'action_date': returned_form.returned_at.strftime('%Y-%m-%d %H:%M'),
            'status': 'RETURNED',
            'remarks': returned_form.reason,
            'type': 'returned'
        })

    # Add cases returned/rejected by BCCO
    for case, returned_form, edcs_user in bcco_returned_cases:
        # Distinguish between returned and rejected based on reason prefix
        if returned_form.reason and returned_form.reason.startswith('REJECTED:'):
            status = 'REJECTED_BY_BCCO'
        else:
            status = 'RETURNED_BY_BCCO'

        submissions_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_user': edcs_user.name,
            'action_date': returned_form.returned_at.strftime('%Y-%m-%d %H:%M'),
            'status': status,
            'remarks': returned_form.reason,
            'type': 'returned_by_bcco'
        })

    # Sort by action date (most recent first)
    submissions_data.sort(key=lambda x: x['action_date'], reverse=True)

    return jsonify({
        'success': True,
        'submissions': submissions_data
    })

@app.route('/tm/my-submissions')
@login_required
def tm_my_submissions():
    if current_user.role != 'TM':
        return jsonify({'error': 'Unauthorized'}), 403

    # Get all cases processed by this TM
    processed_cases = db.session.query(Case, CompletedRequest, User).join(
        CompletedRequest, Case.case_id == CompletedRequest.case_id
    ).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        CompletedRequest.completed_by == current_user.id
    ).order_by(CompletedRequest.completion_date.desc()).all()

    # Get returned cases by this TM
    returned_cases = db.session.query(Case, ReturnedForm, User).join(
        ReturnedForm, Case.case_id == ReturnedForm.case_id
    ).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        ReturnedForm.returned_by == current_user.id
    ).order_by(ReturnedForm.returned_at.desc()).all()

    # Get cases returned or rejected by BCCSP to this TM
    bccsp_returned_cases = db.session.query(Case, ReturnedForm, User).join(
        ReturnedForm, Case.case_id == ReturnedForm.case_id
    ).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        ReturnedForm.returned_to == current_user.id,
        db.or_(
            ReturnedForm.stage_returned_from == 'BCCSP',
            ReturnedForm.stage_returned_from == 'BCC_SP'
        )
    ).order_by(ReturnedForm.returned_at.desc()).all()

    submissions_data = []

    # Add processed cases (approved/rejected)
    for case, completed_request, edcs_user in processed_cases:
        # Get DM and BCCO users
        dm_user = User.query.get(case.assigned_to_dm) if case.assigned_to_dm else None
        bcco_user = User.query.get(case.assigned_to_bcc_officer) if case.assigned_to_bcc_officer else None

        # Change "APPROVED" to "FORWARDED_TO_BCCSP" for better clarity
        display_status = completed_request.final_status
        if display_status == 'APPROVED':
            display_status = 'FORWARDED_TO_BCCSP'

        submissions_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_user': edcs_user.name,
            'dm_user': dm_user.name if dm_user else 'N/A',
            'bcco_user': bcco_user.name if bcco_user else 'N/A',
            'action_date': completed_request.completion_date.strftime('%Y-%m-%d %H:%M'),
            'status': display_status,
            'remarks': completed_request.remarks,
            'type': 'processed'
        })

    # Add returned cases by TM
    for case, returned_form, edcs_user in returned_cases:
        dm_user = User.query.get(case.assigned_to_dm) if case.assigned_to_dm else None
        bcco_user = User.query.get(case.assigned_to_bcc_officer) if case.assigned_to_bcc_officer else None

        submissions_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_user': edcs_user.name,
            'dm_user': dm_user.name if dm_user else 'N/A',
            'bcco_user': bcco_user.name if bcco_user else 'N/A',
            'action_date': returned_form.returned_at.strftime('%Y-%m-%d %H:%M'),
            'status': 'RETURNED',
            'remarks': returned_form.reason,
            'type': 'returned'
        })

    # Add cases returned/rejected by BCCSP
    for case, returned_form, edcs_user in bccsp_returned_cases:
        dm_user = User.query.get(case.assigned_to_dm) if case.assigned_to_dm else None
        bcco_user = User.query.get(case.assigned_to_bcc_officer) if case.assigned_to_bcc_officer else None

        # Distinguish between returned and rejected
        if returned_form.reason and returned_form.reason.startswith('REJECTED:'):
            status = 'REJECTED_BY_BCCSP'
        else:
            status = 'RETURNED_BY_BCCSP'

        submissions_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_user': edcs_user.name,
            'dm_user': dm_user.name if dm_user else 'N/A',
            'bcco_user': bcco_user.name if bcco_user else 'N/A',
            'action_date': returned_form.returned_at.strftime('%Y-%m-%d %H:%M'),
            'status': status,
            'remarks': returned_form.reason,
            'type': 'returned_by_bccsp'
        })

    # Sort by action date (most recent first)
    submissions_data.sort(key=lambda x: x['action_date'], reverse=True)

    return jsonify({
        'success': True,
        'submissions': submissions_data
    })

@app.route('/tm/process-case/<int:case_id>', methods=['POST'])
@login_required
def tm_process_case(case_id):
    if current_user.role != 'TM':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        data = request.get_json()
        action = data.get('action')
        remarks = data.get('remarks', '')

        case = Case.query.get_or_404(case_id)

        # Check if case is being reviewed by current TM
        if case.reviewing_by_tm and case.reviewing_by_tm != current_user.id:
            reviewing_tm = User.query.get(case.reviewing_by_tm)
            return jsonify({
                'success': False,
                'message': f'Case is currently being reviewed by {reviewing_tm.name}'
            })

        # Get existing TM checklist responses for this case
        tm_checklist_responses = TMChecklist.query.filter_by(case_id=case_id).all()
        checklist_summary = ""
        if tm_checklist_responses:
            checklist_summary = f" TM Checklist: {len(tm_checklist_responses)} items reviewed."

        if action == 'approve':
            # Forward to BCCSP
            case.current_stage = 'BCCSP'
            case.status = 'approved_by_tm'
            case.reviewing_by_tm = None  # Clear reviewing status

            # Find BCCSP from same tehsil
            bccsp_user = User.query.filter_by(role='BCCSP', tehsil=current_user.tehsil).first()
            if not bccsp_user:
                # Fallback to any BCCSP if none in same tehsil
                bccsp_user = User.query.filter_by(role='BCCSP').first()

            if bccsp_user:
                case.assigned_to_bcc_specialist = bccsp_user.id

                # Create notification for BCCSP
                notification = Notification(
                    case_id=case.case_id,
                    recipient_id=bccsp_user.id,
                    sender_id=current_user.id,
                    message=f'Case {case.case_number} approved by TM {current_user.name} and forwarded for final review',
                    notification_type='FORWARDED'
                )
                db.session.add(notification)

            # Record in completed_request
            completed_request = CompletedRequest(
                case_id=case.case_id,
                completed_by=current_user.id,
                final_status='APPROVED_BY_TM',
                remarks=f'Approved by TM {current_user.name}: {remarks}{checklist_summary}',
                completion_date=datetime.utcnow()
            )
            db.session.add(completed_request)

            # Add to case history
            history = CaseHistory(
                case_id=case.case_id,
                action='TM_APPROVED',
                performed_by=current_user.id,
                from_stage='TM',
                to_stage='BCCSP',
                comments=f'TM {current_user.name} approved and forwarded to BCCSP. Remarks: {remarks}{checklist_summary}'
            )

        elif action == 'reject':
            case.status = 'rejected_by_tm'
            case.current_stage = 'BCCO'  # Send back to BCCO for review
            case.reviewing_by_tm = None  # Clear reviewing status
            case.assigned_to_tm = None

            # Add to returned_forms so it appears in BCCO Review
            returned_form = ReturnedForm(
                case_id=case.case_id,
                returned_by=current_user.id,
                returned_to=case.assigned_to_bcc_officer,
                reason=f'REJECTED: {remarks}{checklist_summary}',
                stage_returned_from='TM',
                returned_at=datetime.utcnow()
            )
            db.session.add(returned_form)

            # Also add to completed_request for TM's records
            completed_request = CompletedRequest(
                case_id=case.case_id,
                completed_by=current_user.id,
                final_status='REJECTED',
                remarks=f'Rejected by TM {current_user.name}: {remarks}{checklist_summary}',
                completion_date=datetime.utcnow()
            )
            db.session.add(completed_request)

            # Notify BCCO
            if case.assigned_to_bcc_officer:
                notification = Notification(
                    case_id=case.case_id,
                    recipient_id=case.assigned_to_bcc_officer,
                    sender_id=current_user.id,
                    message=f'Case {case.case_number} rejected by TM and returned for review',
                    notification_type='REJECTED'
                )
                db.session.add(notification)

            history = CaseHistory(
                case_id=case.case_id,
                action='TM_REJECTED',
                performed_by=current_user.id,
                from_stage='TM',
                to_stage='BCCO',
                comments=f'TM {current_user.name} rejected the case. Remarks: {remarks}{checklist_summary}'
            )

        elif action == 'return':
            case.current_stage = 'BCCO'
            case.status = 'returned_by_tm'
            case.reviewing_by_tm = None  # Clear reviewing status
            case.assigned_to_tm = None

            returned_form = ReturnedForm(
                case_id=case.case_id,
                returned_by=current_user.id,
                returned_to=case.assigned_to_bcc_officer,
                reason=f'RETURNED: {remarks}{checklist_summary}',
                stage_returned_from='TM',
                returned_at=datetime.utcnow()
            )
            db.session.add(returned_form)

            # Notify BCCO
            if case.assigned_to_bcc_officer:
                notification = Notification(
                    case_id=case.case_id,
                    recipient_id=case.assigned_to_bcc_officer,
                    sender_id=current_user.id,
                    message=f'Case {case.case_number} returned by TM for revision',
                    notification_type='RETURNED'
                )
                db.session.add(notification)

            history = CaseHistory(
                case_id=case.case_id,
                action='TM_RETURNED',
                performed_by=current_user.id,
                from_stage='TM',
                to_stage='BCCO',
                comments=f'TM {current_user.name} returned the case for revision. Remarks: {remarks}{checklist_summary}'
            )

        db.session.add(history)
        db.session.commit()

        return jsonify({'success': True, 'message': f'Case {action}d successfully'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/tm/notifications')
@login_required
def tm_notifications():
    if current_user.role != 'TM':
        return jsonify({'success': False, 'message': 'Access denied'})

    notifications = Notification.query.filter_by(
        recipient_id=current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()

    notifications_data = []
    for notification in notifications:
        case = Case.query.get(notification.case_id) if notification.case_id else None
        notifications_data.append({
            'id': notification.id,
            'message': notification.message,
            'type': notification.notification_type,
            'case_number': case.case_number if case else 'N/A',
            'created_at': notification.created_at.strftime('%Y-%m-%d %H:%M'),
            'is_read': notification.is_read
        })

    return jsonify({
        'success': True,
        'notifications': notifications_data
    })

@app.route('/tm/case-checklist-data/<int:case_id>')
@login_required
def tm_case_checklist_data(case_id):
    if current_user.role != 'TM':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        case = Case.query.get_or_404(case_id)

        # Set case as being reviewed by current TM
        case.reviewing_by_tm = current_user.id
        db.session.commit()

        # Get EDCS details
        edcs_details = EDCSUserDetails.query.filter_by(case_id=case_id).first()
        if not edcs_details:
            return jsonify({'success': False, 'message': 'EDCS details not found'})

        # Get form data based on land type
        edcs_data = {}
        if case.land_type == 'State Land':
            state_form = StateLandForm.query.filter_by(case_id=case_id).first()
            if state_form:
                edcs_data = {
                    'option_number': state_form.option_number,
                    'state_land_available': state_form.state_land_available,
                    'community_land_available': state_form.community_land_available,
                    'land_type': state_form.land_type,
                    'category_jointly_recognized': state_form.category_jointly_recognized,
                    'land_area': str(state_form.land_area) if state_form.land_area else 'N/A',
                    'ownership_allotment_name': state_form.ownership_allotment_name,
                    'department_title': state_form.department_title,
                    'fard_malkiyat_file': state_form.fard_malkiyat_file,
                    'legal_encumbrance': state_form.legal_encumbrance,
                    'social_legal_dispute': state_form.social_legal_dispute,
                    'mutation_possible': state_form.mutation_possible,
                    'department_noc_willing': state_form.department_noc_willing,
                    'noc_requisition_file': state_form.noc_requisition_file,
                    'revenue_dept_allows': state_form.revenue_dept_allows,
                    'revenue_requisition_file': state_form.revenue_requisition_file,
                    'structure_assets_cost': str(state_form.structure_assets_cost) if state_form.structure_assets_cost else 'N/A',
                    'livelihood_impact': state_form.livelihood_impact,
                    'relocation_involved': state_form.relocation_involved,
                    'dc_value': str(state_form.dc_value) if state_form.dc_value else 'N/A',
                    'market_value': str(state_form.market_value) if state_form.market_value else 'N/A',
                    'consultation_meeting_conducted': state_form.consultation_meeting_conducted,
                    'vo_consent': state_form.vo_consent,
                    'vo_consent_file': state_form.vo_consent_file,
                    'neighbors_consent': state_form.neighbors_consent,
                    'neighbors_consent_file': state_form.neighbors_consent_file,
                    'grm_process_explained': state_form.grm_process_explained,
                    'land_viable': state_form.land_viable,
                    'provisions_relaxation_needed': state_form.provisions_relaxation_needed,
                    'relaxation_numbers': state_form.relaxation_numbers,
                    'rationale_for_relaxation': state_form.rationale_for_relaxation,
                    'implications_of_relaxation': state_form.implications_of_relaxation,
                    'mitigation_of_implications': state_form.mitigation_of_implications,
                    'relevant_proofs_file': state_form.relevant_proofs_file
                }
        elif case.land_type == 'Voluntary Land Donation':
            vld_form = VLDChecklistForm.query.filter_by(case_id=case_id).first()
            if vld_form:
                edcs_data = {
                    'option_number': vld_form.option_number,
                    'state_land_available': vld_form.state_land_available,
                    'community_land_available': vld_form.community_land_available,
                    'vld_reasons': vld_form.vld_reasons,
                    'comparative_analysis': vld_form.comparative_analysis,
                    'cost_analysis': vld_form.cost_analysis,
                    'donor_vulnerable_group': vld_form.donor_vulnerable_group,
                    'donor_poverty_line': vld_form.donor_poverty_line,
                    'female_head_household': vld_form.female_head_household,
                    'land_type': vld_form.land_type,
                    'category_jointly_recognized': vld_form.category_jointly_recognized,
                    'land_area_donated': str(vld_form.land_area_donated) if vld_form.land_area_donated else 'N/A',
                    'donor_name': vld_form.donor_name,
                    'donor_gender': vld_form.donor_gender,
                    'landholding_title': vld_form.landholding_title,
                    'fard_malkiyat_file': vld_form.fard_malkiyat_file,
                    'land_on_donor_name': vld_form.land_on_donor_name,
                    'land_pledged': vld_form.land_pledged,
                    'legal_encumbrance': vld_form.legal_encumbrance,
                    'social_legal_dispute': vld_form.social_legal_dispute,
                    'mutation_possible': vld_form.mutation_possible,
                    'donor_willing_mutation': vld_form.donor_willing_mutation,
                    'affidavit_file': vld_form.affidavit_file,
                    'land_leased': vld_form.land_leased,
                    'lessor_impact_cost': str(vld_form.lessor_impact_cost) if vld_form.lessor_impact_cost else 'N/A',
                    'total_landholding': str(vld_form.total_landholding) if vld_form.total_landholding else 'N/A',
                    'total_donations_fard_file': vld_form.total_donations_fard_file,
                    'structure_assets_cost': str(vld_form.structure_assets_cost) if vld_form.structure_assets_cost else 'N/A',
                    'holdings_more_2_kanal': vld_form.holdings_more_2_kanal,
                    'holdings_more_25_kanal': vld_form.holdings_more_25_kanal,
                    'livelihood_impact': vld_form.livelihood_impact,
                    'relocation_involved': vld_form.relocation_involved,
                    'donation_percentage': str(vld_form.donation_percentage) if vld_form.donation_percentage else 'N/A',
                    'dc_value': str(vld_form.dc_value) if vld_form.dc_value else 'N/A',
                    'market_value': str(vld_form.market_value) if vld_form.market_value else 'N/A',
                    'consultation_meeting_conducted': vld_form.consultation_meeting_conducted,
                    'vo_consent': vld_form.vo_consent,
                    'vo_consent_file': vld_form.vo_consent_file,
                    'neighbors_consent': vld_form.neighbors_consent,
                    'neighbors_consent_file': vld_form.neighbors_consent_file,
                    'grm_process_explained': vld_form.grm_process_explained,
                    'donor_knows_no_rights': vld_form.donor_knows_no_rights,
                    'donor_knows_equal_access': vld_form.donor_knows_equal_access,
                    'donor_willing_pay_taxes': vld_form.donor_willing_pay_taxes,
                    'land_viable': vld_form.land_viable,
                    'provisions_relaxation_needed': vld_form.provisions_relaxation_needed,
                    'relaxation_numbers': vld_form.relaxation_numbers,
                    'rationale_for_relaxation': vld_form.rationale_for_relaxation,
                    'implications_of_relaxation': vld_form.implications_of_relaxation,
                    'mitigation_of_implications': vld_form.mitigation_of_implications,
                    'relevant_proofs_file': vld_form.relevant_proofs_file
                }

        # Get DM responses
        dm_responses = {}
        dm_checklist = DMChecklist.query.filter_by(case_id=case_id).all()
        for dm_item in dm_checklist:
            dm_responses[f'question_{dm_item.question_number}'] = dm_item.dm_response or 'N/A'

        # Get BCC responses
        bcc_responses = {}
        bcc_checklist = BCCChecklist.query.filter_by(case_id=case_id).all()
        for bcc_item in bcc_checklist:
            bcc_responses[f'question_{bcc_item.question_number}'] = {
                'bcc_response': bcc_item.bcc_response or 'N/A',
                'bcc_remarks': bcc_item.bcc_remarks or ''
            }

        # Get TM responses (if any exist from previous save)
        tm_responses = {}
        tm_checklist = TMChecklist.query.filter_by(case_id=case_id).all()
        for tm_item in tm_checklist:
            tm_responses[f'question_{tm_item.question_number}'] = {
                'tm_response': tm_item.tm_response or '',
                'tm_remarks': tm_item.tm_remarks or ''
            }

        return jsonify({
            'success': True,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_data': edcs_data,
            'dm_responses': dm_responses,
            'bcc_responses': bcc_responses,
            'tm_responses': tm_responses
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/tm/save-checklist-responses', methods=['POST'])
@login_required
def tm_save_checklist_responses():
    if current_user.role != 'TM':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        data = request.get_json()
        case_id = data.get('case_id')
        tm_responses = data.get('tm_responses', [])

        if not case_id:
            return jsonify({'success': False, 'message': 'Case ID is required'})

        case = Case.query.get_or_404(case_id)

        # Delete existing TM checklist responses for this case to avoid duplicates
        TMChecklist.query.filter_by(case_id=case_id).delete()

        # Save each TM response
        for response in tm_responses:
            tm_checklist = TMChecklist(
                case_id=case_id,
                question_number=response.get('question_number'),
                question_text=response.get('question_text', ''),
                tm_response=response.get('tm_response'),
                tm_remarks=response.get('tm_remarks'),
                created_by=current_user.id
            )
            db.session.add(tm_checklist)

        db.session.commit()

        return jsonify({'success': True, 'message': 'TM checklist responses saved successfully'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/tm/mark-notification-read/<int:notification_id>', methods=['POST'])
@login_required
def tm_mark_notification_read(notification_id):
    if current_user.role != 'TM':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        notification = Notification.query.get_or_404(notification_id)

        # Verify notification belongs to current user
        if notification.recipient_id != current_user.id:
            return jsonify({'success': False, 'message': 'Access denied'})

        notification.is_read = True
        db.session.commit()

        return jsonify({'success': True, 'message': 'Notification marked as read'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/tm/mark-all-notifications-read', methods=['POST'])
@login_required
def tm_mark_all_notifications_read():
    if current_user.role != 'TM':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        # Mark all notifications as read for current user
        Notification.query.filter_by(
            recipient_id=current_user.id,
            is_read=False
        ).update({'is_read': True})

        db.session.commit()

        return jsonify({'success': True, 'message': 'All notifications marked as read'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/dm/pending-cases')
@login_required
def dm_pending_cases():
    if current_user.role != 'DM':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Get cases assigned to current DM user from same tehsil
    pending_cases = db.session.query(Case, User).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        Case.assigned_to_dm == current_user.id,
        Case.current_stage == 'DM',
        User.tehsil == current_user.tehsil
    ).all()
    
    cases_data = []
    for case, edcs_user in pending_cases:
        cases_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'created_at': case.created_at.strftime('%Y-%m-%d'),
            'status': case.status,
            'edcs_user': edcs_user.name,
            'edcs_tehsil': edcs_user.tehsil
        })
    
    return jsonify({'success': True, 'cases': cases_data})

@app.route('/bcc/mark-all-notifications-read', methods=['POST'])
@login_required
def bcc_mark_all_notifications_read():
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Mark all notifications as read for current user
    Notification.query.filter_by(
        recipient_id=current_user.id,
        is_read=False
    ).update({'is_read': True})
    
    db.session.commit()
    return jsonify({'success': True, 'message': 'All notifications marked as read'})


@app.route('/bcc/case-details/<int:case_id>')
@login_required
def bcc_case_details(case_id):
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Get case with EDCS details
    case_data = db.session.query(Case, EDCSUserDetails).join(
        EDCSUserDetails, Case.case_id == EDCSUserDetails.case_id
    ).filter(Case.case_id == case_id).first()
    
    if not case_data:
        return jsonify({'success': False, 'message': 'Case not found'})
    
    case, edcs_details = case_data
    
    # Get form data based on land type
    form_data = None
    if case.land_type == 'State Land':
        form_data = StateLandForm.query.filter_by(case_id=case_id).first()
    elif case.land_type == 'Voluntary Land Donation':
        form_data = VLDChecklistForm.query.filter_by(case_id=case_id).first()
    
    # Get DM responses
    dm_responses = {}
    dm_checklist = DMChecklist.query.filter_by(case_id=case_id).all()
    for dm_resp in dm_checklist:
        dm_responses[f'question_{dm_resp.question_number}'] = dm_resp.dm_response

    # Get BCC responses
    bcc_responses = {}
    bcc_checklist = BCCChecklist.query.filter_by(case_id=case_id).all()
    for bcc_resp in bcc_checklist:
        bcc_responses[f'question_{bcc_resp.question_number}'] = {
            'bcc_response': bcc_resp.bcc_response,
            'bcc_remarks': bcc_resp.bcc_remarks
        }

    # Convert form data to dict
    edcs_data = {}
    if form_data:
        for column in form_data.__table__.columns:
            if column.name not in ['id', 'case_id', 'created_at', 'updated_at', 'created_by']:
                value = getattr(form_data, column.name)
                # Convert Decimal to string for JSON serialization
                if hasattr(value, '__float__'):
                    value = str(value)
                edcs_data[column.name] = value

    return jsonify({
        'success': True,
        'case': {
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'status': case.status,
            'current_stage': case.current_stage
        },
        'edcs_details': {
            'consultant_name': edcs_details.consultant_name,
            'village_name': edcs_details.village_name,
            'settlement_name': edcs_details.settlement_name,
            'region': edcs_details.region,
            'area_required_marla': str(edcs_details.area_required_marla),
            'land_proposed_for': edcs_details.land_proposed_for
        },
        'edcs_data': edcs_data,
        'dm_responses': dm_responses,
        'bcc_responses': bcc_responses,
        'land_type': case.land_type,
        'case_number': case.case_number
    })



@app.route('/bcc/mark-notification-read/<int:notification_id>', methods=['POST'])
@login_required
def bcc_mark_notification_read(notification_id):
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    notification = Notification.query.filter_by(
        id=notification_id,
        recipient_id=current_user.id
    ).first()
    
    if notification:
        notification.is_read = True
        db.session.commit()
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'message': 'Notification not found'})

@app.route('/bcc/notifications')
@login_required
def bcc_notifications():
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    notifications = Notification.query.filter_by(
        recipient_id=current_user.id
    ).order_by(Notification.created_at.desc()).all()
    
    notification_data = []
    for notif in notifications:
        case = Case.query.get(notif.case_id)
        notification_data.append({
            'id': notif.id,
            'case_number': case.case_number if case else 'N/A',
            'message': notif.message,
            'type': notif.notification_type,
            'is_read': notif.is_read,
            'created_at': notif.created_at.strftime('%Y-%m-%d %H:%M')
        })
    
    return jsonify({'success': True, 'notifications': notification_data})

@app.route('/get-case-by-number/<case_number>')
@login_required
def get_case_by_number(case_number):
    case = Case.query.filter_by(case_number=case_number).first()
    if case:
        return jsonify({'success': True, 'case_id': case.case_id})
    return jsonify({'success': False, 'message': 'Case not found'})

@app.route('/edcs/submit-state-land-form', methods=['POST'])
@login_required
def submit_state_land_form():
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        # Get the case ID from the current session or form data
        case_id = request.form.get('case_id') or session.get('current_case_id')
        
        if not case_id:
            return jsonify({'success': False, 'message': 'Case ID not found'})
        
        # Get the case and EDCS details
        case = Case.query.get(case_id)
        edcs_details = EDCSUserDetails.query.filter_by(case_id=case_id).first()
        
        if not case or not edcs_details:
            return jsonify({'success': False, 'message': 'Case or EDCS details not found'})
        
        # Create or update state land form
        existing_form = StateLandForm.query.filter_by(case_id=case_id).first()
        
        if existing_form:
            # Update existing form
            state_form = existing_form
        else:
            # Create new form
            state_form = StateLandForm(case_id=case_id, created_by=current_user.id)
        
        # Populate form data from request
        state_form.option_number = int(request.form.get('option_number', 1))
        state_form.state_land_available = request.form.get('state_land_available')
        state_form.community_land_available = request.form.get('community_land_available')
        state_form.land_type = request.form.get('land_type')
        state_form.category_jointly_recognized = request.form.get('category_jointly_recognized')
        state_form.land_area = safe_float_convert(request.form.get('land_area'))
        state_form.ownership_allotment_name = request.form.get('ownership_allotment_name')
        state_form.department_title = request.form.get('department_title')
        state_form.legal_encumbrance = request.form.get('legal_encumbrance')
        state_form.social_legal_dispute = request.form.get('social_legal_dispute')
        state_form.mutation_possible = request.form.get('mutation_possible')
        state_form.department_noc_willing = request.form.get('department_noc_willing')
        state_form.structure_assets_cost = safe_float_convert(request.form.get('structure_assets_cost'))
        state_form.livelihood_impact = request.form.get('livelihood_impact')
        state_form.relocation_involved = request.form.get('relocation_involved')
        state_form.dc_value = safe_float_convert(request.form.get('dc_value'))
        state_form.market_value = safe_float_convert(request.form.get('market_value'))
        state_form.consultation_meeting_conducted = request.form.get('consultation_meeting_conducted')
        state_form.vo_consent = request.form.get('vo_consent')
        state_form.neighbors_consent = request.form.get('neighbors_consent')
        state_form.grm_process_explained = request.form.get('grm_process_explained')
        state_form.land_viable = request.form.get('land_viable')
        state_form.provisions_relaxation_needed = request.form.get('provisions_relaxation_needed')
        state_form.relaxation_numbers = request.form.get('relaxation_numbers')
        state_form.rationale_for_relaxation = request.form.get('rationale_for_relaxation')
        state_form.implications_of_relaxation = request.form.get('implications_of_relaxation')
        state_form.mitigation_of_implications = request.form.get('mitigation_of_implications')
        
        # Set additional fields
        state_form.land_ownership = request.form.get('land_ownership')
        state_form.land_use = request.form.get('land_use')
        state_form.land_tenure = request.form.get('land_tenure')
        
        # Set as submitted
        state_form.is_draft = False
        state_form.submitted_at = datetime.utcnow()
        
        # Update case status
        case.status = 'submitted'
        case.current_stage = 'DM'
        
        # Assign to DM
        dm_user = User.query.filter_by(role='DM').first()
        if dm_user:
            case.assigned_to_dm = dm_user.id
            
            # Create notification for DM
            notification = Notification(
                case_id=case.case_id,
                recipient_id=dm_user.id,
                sender_id=current_user.id,
                message=f'New State Land form submitted for case {case.case_number}',
                notification_type='NEW_CASE'
            )
            db.session.add(notification)
        
        # Add to case history
        history = CaseHistory(
            case_id=case.case_id,
            action='FORM_SUBMITTED',
            performed_by=current_user.id,
            from_stage='EDCS',
            to_stage='DM',
            comments='State Land form submitted to DM'
        )
        db.session.add(history)
        
        if not existing_form:
            db.session.add(state_form)
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'State Land form submitted successfully!'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/dm/save-checklist', methods=['POST'])
@login_required
def dm_save_checklist():
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        data = request.get_json()
        case_id = data.get('case_id')
        dm_responses = data.get('dm_responses', [])
        
        case = Case.query.get_or_404(case_id)
        
        # Delete existing responses for this case to avoid duplicates
        DMChecklist.query.filter_by(case_id=case_id).delete()
        
        # Save each DM response with proper question text
        questions = [
            "Is the land type correctly identified?",
            "Are all required documents submitted?",
            "Is the land area calculation accurate?",
            "Are GPS coordinates provided and verified?",
            "Is donor consent properly documented?",
            "Are neighbors' consents obtained?",
            "Is the land viable for the proposed use?",
            "Are all legal requirements met?",
            "Is the consultation process complete?",
            "Are there any conflicts or disputes?"
        ]
        
        for response in dm_responses:
            question_num = response.get('question_number')
            dm_resp = response.get('dm_response')
            dm_remarks = response.get('dm_remarks')
            
            if question_num and (dm_resp or dm_remarks):
                question_text = questions[question_num - 1] if question_num <= len(questions) else f'Question {question_num}'
                
                new_response = DMChecklist(
                    case_id=int(case_id),
                    question_number=question_num,
                    question_text=question_text,
                    dm_response=dm_resp,
                    dm_remarks=dm_remarks,
                    created_by=current_user.id
                )
                db.session.add(new_response)
        
        # Add to case history
        history = CaseHistory(
            case_id=case.case_id,
            action='DM_CHECKLIST_SAVED',
            performed_by=current_user.id,
            from_stage='DM',
            to_stage='DM',
            comments=f'DM checklist saved for case {case.case_number} - Case now under review by {current_user.name}'
        )
        db.session.add(history)
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'DM Checklist saved successfully - Case now under your review'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error saving checklist: {str(e)}'})

@app.route('/edcs/dm-remarks/<case_number>')
@login_required
def edcs_get_dm_remarks(case_number):
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        # Get case by case number
        case = Case.query.filter_by(case_number=case_number).first()
        if not case:
            return jsonify({'success': False, 'message': 'Case not found'})
        
        # Get DM checklist responses
        dm_checklist = DMChecklist.query.filter_by(case_id=case.case_id).all()
        
        checklist_data = []
        for item in dm_checklist:
            checklist_data.append({
                'question_number': item.question_number,
                'question_text': item.question_text,
                'dm_response': item.dm_response,
                'dm_remarks': item.dm_remarks,
                'created_at': item.created_at.strftime('%Y-%m-%d %H:%M:%S') if item.created_at else None
            })
        
        # Get final decision if exists
        completed_request = CompletedRequest.query.filter_by(case_id=case.case_id).first()
        final_decision_data = None
        if completed_request:
            final_decision_data = {
                'final_status': completed_request.final_status,
                'completion_date': completed_request.completion_date.strftime('%Y-%m-%d %H:%M:%S') if completed_request.completion_date else None,
                'remarks': completed_request.remarks,
                'completed_by': completed_request.completed_by
            }
        
        return jsonify({
            'success': True,
            'case_number': case_number,
            'dm_checklist': checklist_data,
            'final_decision': final_decision_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/dm/final-decision', methods=['POST'])
@login_required
def dm_final_decision():
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        data = request.get_json()
        case_id = data.get('case_id')
        action = data.get('action')  # 'approve', 'reject', 'return'
        
        case = Case.query.get(case_id)
        if not case or case.assigned_to_dm != current_user.id:
            return jsonify({'success': False, 'message': 'Case not found or access denied'})
        
        if action == 'approve':
            # Forward to BCCO from same tehsil
            case.current_stage = 'BCCO'

            # Find BCCO from same tehsil as the DM
            dm_user = User.query.get(case.assigned_to_dm)
            if dm_user:
                bcc_officer = User.query.filter_by(role='BCCO', tehsil=dm_user.tehsil).first()
            else:
                bcc_officer = None

            if not bcc_officer:
                # Fallback to any BCCO if none in same tehsil
                bcc_officer = User.query.filter_by(role='BCCO').first()

            if bcc_officer:
                case.assigned_to_bcc_officer = bcc_officer.id
                
                # Create notification for BCC Officer
                notification = Notification(
                    case_id=case.case_id,
                    recipient_id=bcc_officer.id,
                    sender_id=current_user.id,
                    message=f'Case {case.case_number} approved by DM and forwarded for review',
                    notification_type='FORWARDED'
                )
                db.session.add(notification)
            
            # Add to case history
            history = CaseHistory(
                case_id=case.case_id,
                action='DM_APPROVED',
                performed_by=current_user.id,
                from_stage='DM',
                to_stage='BCC_OFFICER',
                comments='DM approved and forwarded to BCC Officer'
            )
            
        elif action == 'reject':
            case.status = 'rejected'
            case.current_stage = 'COMPLETED'
            
            # Create completed request record
            completed_request = CompletedRequest(
                case_id=case.case_id,
                completed_by=current_user.id,
                final_status='REJECTED',
                remarks='Rejected by DM'
            )
            db.session.add(completed_request)
            
            # Add to case history
            history = CaseHistory(
                case_id=case.case_id,
                action='DM_REJECTED',
                performed_by=current_user.id,
                from_stage='DM',
                to_stage='COMPLETED',
                comments='DM rejected the case'
            )
            
        elif action == 'return':
            # Return to EDCS
            case.current_stage = 'EDCS'
            case.status = 'draft'
            
            # Create returned form record
            returned_form = ReturnedForm(
                case_id=case.case_id,
                returned_by=current_user.id,
                returned_to=case.edcs_user_id,
                reason='Returned by DM for revision',
                stage_returned_from='DM'
            )
            db.session.add(returned_form)
            
            # Create notification for EDCS user
            notification = Notification(
                case_id=case.case_id,
                recipient_id=case.edcs_user_id,
                sender_id=current_user.id,
                message=f'Case {case.case_number} returned by DM for revision',
                notification_type='RETURNED'
            )
            db.session.add(notification)
            
            # Add to case history
            history = CaseHistory(
                case_id=case.case_id,
                action='DM_RETURNED',
                performed_by=current_user.id,
                from_stage='DM',
                to_stage='EDCS',
                comments='DM returned to EDCS for revision'
            )
        
        db.session.add(history)
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'Case {action}d successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/dm/case-checklist-data/<int:case_id>')
@login_required
def dm_case_checklist_data(case_id):
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        # Get case details
        case = Case.query.get(case_id)
        if not case:
            return jsonify({'success': False, 'message': 'Case not found'})
        
        # Get EDCS details
        edcs_details = EDCSUserDetails.query.filter_by(case_id=case_id).first()
        if not edcs_details:
            return jsonify({'success': False, 'message': 'EDCS details not found'})
        
        # Get saved DM responses
        dm_responses = DMChecklist.query.filter_by(case_id=case_id).all()
        dm_responses_dict = {}
        for resp in dm_responses:
            dm_responses_dict[resp.question_number] = {
                'dm_response': resp.dm_response,
                'dm_remarks': resp.dm_remarks
            }
        
        # Get form data based on land type
        form_data = {}
        if case.land_type == 'State Land':
            state_form = StateLandForm.query.filter_by(case_id=case_id).first()
            if state_form:
                form_data = {
                    'option_number': state_form.option_number,
                    'state_land_available': state_form.state_land_available,
                    'community_land_available': state_form.community_land_available,
                    'land_type': state_form.land_type,
                    'category_jointly_recognized': state_form.category_jointly_recognized,
                    'land_area': str(state_form.land_area) if state_form.land_area else '',
                    'ownership_allotment_name': state_form.ownership_allotment_name,
                    'department_title': state_form.department_title,
                    'legal_encumbrance': state_form.legal_encumbrance,
                    'social_legal_dispute': state_form.social_legal_dispute,
                    'mutation_possible': state_form.mutation_possible,
                    'department_noc_willing': state_form.department_noc_willing,
                    'revenue_dept_allows': state_form.revenue_dept_allows,
                    'structure_assets_cost': str(state_form.structure_assets_cost) if state_form.structure_assets_cost else '',
                    'livelihood_impact': state_form.livelihood_impact,
                    'relocation_involved': state_form.relocation_involved,
                    'dc_value': str(state_form.dc_value) if state_form.dc_value else '',
                    'market_value': str(state_form.market_value) if state_form.market_value else '',
                    'consultation_meeting_conducted': state_form.consultation_meeting_conducted,
                    'vo_consent': state_form.vo_consent,
                    'neighbors_consent': state_form.neighbors_consent,
                    'grm_process_explained': state_form.grm_process_explained,
                    'land_viable': state_form.land_viable,
                    'provisions_relaxation_needed': state_form.provisions_relaxation_needed
                }
        elif case.land_type == 'Voluntary Land Donation':
            vld_form = VLDChecklistForm.query.filter_by(case_id=case_id).first()
            if vld_form:
                form_data = {
                    'option_number': vld_form.option_number,
                    'state_land_available': vld_form.state_land_available,
                    'community_land_available': vld_form.community_land_available,
                    'vld_reasons': vld_form.vld_reasons,
                    'comparative_analysis': vld_form.comparative_analysis,
                    'cost_analysis': vld_form.cost_analysis,
                    'donor_vulnerable_group': vld_form.donor_vulnerable_group,
                    'donor_poverty_line': vld_form.donor_poverty_line,
                    'female_head_household': vld_form.female_head_household,
                    'land_type': vld_form.land_type,
                    'category_jointly_recognized': vld_form.category_jointly_recognized,
                    'land_area_donated': str(vld_form.land_area_donated) if vld_form.land_area_donated else '',
                    'donor_name': vld_form.donor_name,
                    'donor_gender': vld_form.donor_gender,
                    'landholding_title': vld_form.landholding_title,
                    'land_on_donor_name': vld_form.land_on_donor_name,
                    'legal_encumbrance': vld_form.legal_encumbrance,
                    'social_legal_dispute': vld_form.social_legal_dispute,
                    'mutation_possible': vld_form.mutation_possible,
                    'consultation_meeting_conducted': vld_form.consultation_meeting_conducted,
                    'vo_consent': vld_form.vo_consent,
                    'neighbors_consent': vld_form.neighbors_consent,
                    'grm_process_explained': vld_form.grm_process_explained,
                    'land_viable': vld_form.land_viable
                }
        
        return jsonify({
            'success': True,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_data': form_data,
            'dm_responses': dm_responses_dict
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/edcs/submit-vld-form', methods=['POST'])
@login_required
def submit_vld_form():
    if current_user.role != 'EDCS':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        # Get the case ID from the current session or form data
        case_id = request.form.get('case_id') or session.get('current_case_id')
        
        if not case_id:
            return jsonify({'success': False, 'message': 'Case ID not found'})
        
        # Get the case and EDCS details
        case = Case.query.get(case_id)
        edcs_details = EDCSUserDetails.query.filter_by(case_id=case_id).first()
        
        if not case or not edcs_details:
            return jsonify({'success': False, 'message': 'Case or EDCS details not found'})
        
        # Create or update VLD form
        existing_form = VLDChecklistForm.query.filter_by(case_id=case_id).first()
        
        if existing_form:
            vld_form = existing_form
        else:
            vld_form = VLDChecklistForm(case_id=case_id, created_by=current_user.id)
        
        # Populate form data from request
        try:
            vld_form.option_number = safe_int_convert(request.form.get('option_number', 1))
            vld_form.state_land_available = request.form.get('state_land_available', '')
            vld_form.community_land_available = request.form.get('community_land_available', '')
            vld_form.vld_reasons = request.form.get('vld_reasons', '')
            vld_form.comparative_analysis = request.form.get('comparative_analysis', '')
            vld_form.cost_analysis = request.form.get('cost_analysis', '')
            vld_form.donor_vulnerable_group = request.form.get('donor_vulnerable_group', '')
            vld_form.donor_poverty_line = request.form.get('donor_poverty_line', '')
            vld_form.female_head_household = request.form.get('female_head_household', '')
            vld_form.land_type = request.form.get('land_type', '')
            vld_form.category_jointly_recognized = request.form.get('category_jointly_recognized', '')
            vld_form.land_area_donated = safe_float_convert(request.form.get('land_area_donated'))
            vld_form.donor_name = request.form.get('donor_name', '')
            vld_form.donor_gender = request.form.get('donor_gender', '')
            vld_form.landholding_title = request.form.get('landholding_title', '')
            vld_form.land_on_donor_name = request.form.get('land_on_donor_name', '')
            vld_form.land_pledged = request.form.get('land_pledged', '')
            vld_form.legal_encumbrance = request.form.get('legal_encumbrance', '')
            vld_form.social_legal_dispute = request.form.get('social_legal_dispute', '')
            vld_form.mutation_possible = request.form.get('mutation_possible', '')
            vld_form.donor_willing_mutation = request.form.get('donor_willing_mutation', '')
            vld_form.land_leased = request.form.get('land_leased', '')
            vld_form.lessor_impact_cost = safe_float_convert(request.form.get('lessor_impact_cost'))
            vld_form.total_landholding = safe_float_convert(request.form.get('total_landholding'))
            vld_form.structure_assets_cost = safe_float_convert(request.form.get('structure_assets_cost'))
            vld_form.holdings_more_2_kanal = request.form.get('holdings_more_2_kanal', '')
            vld_form.holdings_more_25_kanal = request.form.get('holdings_more_25_kanal', '')
            vld_form.livelihood_impact = request.form.get('livelihood_impact', '')
            vld_form.relocation_involved = request.form.get('relocation_involved', '')
            vld_form.donation_percentage = safe_float_convert(request.form.get('donation_percentage'))
            vld_form.dc_value = safe_float_convert(request.form.get('dc_value'))
            vld_form.market_value = safe_float_convert(request.form.get('market_value'))
            vld_form.consultation_meeting_conducted = request.form.get('consultation_meeting_conducted', '')
            vld_form.vo_consent = request.form.get('vo_consent', '')
            vld_form.neighbors_consent = request.form.get('neighbors_consent', '')
            vld_form.grm_process_explained = request.form.get('grm_process_explained', '')
            vld_form.donor_knows_no_rights = request.form.get('donor_knows_no_rights', '')
            vld_form.donor_knows_equal_access = request.form.get('donor_knows_equal_access', '')
            vld_form.donor_willing_pay_taxes = request.form.get('donor_willing_pay_taxes', '')
            vld_form.land_viable = request.form.get('land_viable', '')
            vld_form.provisions_relaxation_needed = request.form.get('provisions_relaxation_needed', '')
            vld_form.relaxation_numbers = request.form.get('relaxation_numbers', '')
            vld_form.rationale_for_relaxation = request.form.get('rationale_for_relaxation', '')
            vld_form.implications_of_relaxation = request.form.get('implications_of_relaxation', '')
            vld_form.mitigation_of_implications = request.form.get('mitigation_of_implications', '')

        except Exception as e:
            print(f"Error processing VLD form fields: {e}")
            return jsonify({'success': False, 'message': f'Error processing form data: {str(e)}'})
        
        # Set as submitted
        vld_form.is_draft = False
        vld_form.submitted_at = datetime.utcnow()
        
        # Update case status
        case.status = 'submitted'
        case.current_stage = 'DM'
        
        if not existing_form:
            db.session.add(vld_form)
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'VLD Checklist form submitted successfully!'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/bcc/case-checklist-data/<int:case_id>')
@login_required
def bcc_case_checklist_data(case_id):
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        # Get case with EDCS details
        case_data = db.session.query(Case, EDCSUserDetails).join(
            EDCSUserDetails, Case.case_id == EDCSUserDetails.case_id
        ).filter(Case.case_id == case_id).first()
        
        if not case_data:
            return jsonify({'success': False, 'message': 'Case not found'})
        
        case, edcs_details = case_data
        
        # Get form data based on land type
        edcs_data = {}
        if case.land_type == 'State Land':
            state_land_form = StateLandForm.query.filter_by(case_id=case_id).first()
            if state_land_form:
                edcs_data = {
                    'option_number': state_land_form.option_number,
                    'state_land_available': state_land_form.state_land_available,
                    'community_land_available': state_land_form.community_land_available,
                    'land_type': state_land_form.land_type,
                    'category_jointly_recognized': state_land_form.category_jointly_recognized,
                    'land_area': str(state_land_form.land_area) if state_land_form.land_area else '',
                    'ownership_allotment_name': state_land_form.ownership_allotment_name,
                    'department_title': state_land_form.department_title,
                    'legal_encumbrance': state_land_form.legal_encumbrance,
                    'social_legal_dispute': state_land_form.social_legal_dispute,
                    'mutation_possible': state_land_form.mutation_possible,
                    'department_noc_willing': state_land_form.department_noc_willing,
                    'revenue_dept_allows': state_land_form.revenue_dept_allows,
                    'structure_assets_cost': str(state_land_form.structure_assets_cost) if state_land_form.structure_assets_cost else '',
                    'livelihood_impact': state_land_form.livelihood_impact,
                    'relocation_involved': state_land_form.relocation_involved,
                    'dc_value': str(state_land_form.dc_value) if state_land_form.dc_value else '',
                    'market_value': str(state_land_form.market_value) if state_land_form.market_value else '',
                    'consultation_meeting_conducted': state_land_form.consultation_meeting_conducted,
                    'vo_consent': state_land_form.vo_consent,
                    'neighbors_consent': state_land_form.neighbors_consent,
                    'grm_process_explained': state_land_form.grm_process_explained,
                    'land_viable': state_land_form.land_viable,
                    'provisions_relaxation_needed': state_land_form.provisions_relaxation_needed,
                    'relaxation_numbers': state_land_form.relaxation_numbers,
                    'rationale_for_relaxation': state_land_form.rationale_for_relaxation,
                    'implications_of_relaxation': state_land_form.implications_of_relaxation,
                    'mitigation_of_implications': state_land_form.mitigation_of_implications
                }
        elif case.land_type == 'Voluntary Land Donation':
            vld_form = VLDChecklistForm.query.filter_by(case_id=case_id).first()
            if vld_form:
                edcs_data = {
                    'option_number': vld_form.option_number,
                    'state_land_available': vld_form.state_land_available,
                    'community_land_available': vld_form.community_land_available,
                    'vld_reasons': vld_form.vld_reasons,
                    'comparative_analysis': vld_form.comparative_analysis,
                    'cost_analysis': vld_form.cost_analysis,
                    'donor_vulnerable_group': vld_form.donor_vulnerable_group,
                    'donor_poverty_line': vld_form.donor_poverty_line,
                    'female_head_household': vld_form.female_head_household,
                    'land_type': vld_form.land_type,
                    'category_jointly_recognized': vld_form.category_jointly_recognized,
                    'land_area_donated': str(vld_form.land_area_donated) if vld_form.land_area_donated else '',
                    'donor_name': vld_form.donor_name,
                    'donor_gender': vld_form.donor_gender,
                    'landholding_title': vld_form.landholding_title,
                    'land_on_donor_name': vld_form.land_on_donor_name,
                    'land_pledged': vld_form.land_pledged,
                    'legal_encumbrance': vld_form.legal_encumbrance,
                    'social_legal_dispute': vld_form.social_legal_dispute,
                    'mutation_possible': vld_form.mutation_possible,
                    'donor_willing_mutation': vld_form.donor_willing_mutation,
                    'land_leased': vld_form.land_leased,
                    'lessor_impact_cost': str(vld_form.lessor_impact_cost) if vld_form.lessor_impact_cost else '',
                    'total_landholding': str(vld_form.total_landholding) if vld_form.total_landholding else '',
                    'structure_assets_cost': str(vld_form.structure_assets_cost) if vld_form.structure_assets_cost else '',
                    'holdings_more_2_kanal': vld_form.holdings_more_2_kanal,
                    'holdings_more_25_kanal': vld_form.holdings_more_25_kanal,
                    'livelihood_impact': vld_form.livelihood_impact,
                    'relocation_involved': vld_form.relocation_involved,
                    'donation_percentage': str(vld_form.donation_percentage) if vld_form.donation_percentage else '',
                    'dc_value': str(vld_form.dc_value) if vld_form.dc_value else '',
                    'market_value': str(vld_form.market_value) if vld_form.market_value else '',
                    'consultation_meeting_conducted': vld_form.consultation_meeting_conducted,
                    'vo_consent': vld_form.vo_consent,
                    'neighbors_consent': vld_form.neighbors_consent,
                    'grm_process_explained': vld_form.grm_process_explained,
                    'donor_knows_no_rights': vld_form.donor_knows_no_rights,
                    'donor_knows_equal_access': vld_form.donor_knows_equal_access,
                    'donor_willing_pay_taxes': vld_form.donor_willing_pay_taxes,
                    'land_viable': vld_form.land_viable,
                    'provisions_relaxation_needed': vld_form.provisions_relaxation_needed,
                    'relaxation_numbers': vld_form.relaxation_numbers,
                    'rationale_for_relaxation': vld_form.rationale_for_relaxation,
                    'implications_of_relaxation': vld_form.implications_of_relaxation,
                    'mitigation_of_implications': vld_form.mitigation_of_implications
                }
        
        # Get DM responses
        dm_responses = {}
        dm_checklist = DMChecklist.query.filter_by(case_id=case_id).all()
        for dm_response in dm_checklist:
            dm_responses[f'question_{dm_response.question_number}'] = dm_response.dm_response
        
        # Get existing BCC responses
        bcc_responses = {}
        bcc_checklist = BCCChecklist.query.filter_by(case_id=case_id).all()
        print(f"DEBUG FETCH: Found {len(bcc_checklist)} BCC responses for case {case_id}")
        
        for bcc_response in bcc_checklist:
            print(f"DEBUG FETCH: BCC Response {bcc_response.question_number}: {bcc_response.bcc_response}, {bcc_response.bcc_remarks}")
            bcc_responses[f'question_{bcc_response.question_number}'] = {
                'bcc_response': bcc_response.bcc_response,
                'bcc_remarks': bcc_response.bcc_remarks
            }
        
        print(f"DEBUG FETCH: Final bcc_responses dict: {bcc_responses}")
        
        return jsonify({
            'success': True,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_data': edcs_data,
            'dm_responses': dm_responses,
            'bcc_responses': bcc_responses
        })
        
    except Exception as e:
        print(f"DEBUG FETCH: Error occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error fetching data: {str(e)}'})

@app.route('/bcc/pending-cases-from-dm')
@login_required
def bcc_pending_cases_from_dm():
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})

    # Get cases approved by DM and forwarded to BCCO from same tehsil
    # ALSO include cases returned or rejected by TM so BCCO can re-review them
    # STRICT FILTER: Only show cases from same tehsil AND (assigned to current user OR not assigned yet)
    # AND not locked by another BCCO
    pending_cases = db.session.query(Case, User).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        Case.current_stage == 'BCCO',
        # Include: approved by DM, OR returned by TM, OR rejected by TM
        db.or_(
            Case.status == 'approved',
            Case.status == 'returned_by_tm',
            Case.status == 'rejected_by_tm'
        ),
        User.tehsil == current_user.tehsil,
        # Additional safety: Only show if assigned to current user OR not assigned to anyone
        db.or_(
            Case.assigned_to_bcc_officer == current_user.id,
            Case.assigned_to_bcc_officer == None
        ),
        # Don't show cases locked by other BCCO users
        db.or_(
            Case.reviewing_by_bcc == current_user.id,
            Case.reviewing_by_bcc == None
        )
    ).all()

    cases_data = []
    for case, edcs_user in pending_cases:
        # Get DM approval info
        dm_approval = CompletedRequest.query.filter_by(
            case_id=case.case_id,
            final_status='APPROVED'
        ).first()

        # Count DM responses
        dm_responses_count = DMChecklist.query.filter_by(case_id=case.case_id).count()

        # Determine status display
        status_display = case.status
        if case.status == 'returned_by_tm':
            status_display = 'Returned by TM'
        elif case.status == 'rejected_by_tm':
            status_display = 'Rejected by TM'
        elif case.status == 'approved':
            status_display = 'Approved by DM'

        cases_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'created_at': case.created_at.strftime('%Y-%m-%d'),
            'dm_approved_at': dm_approval.completion_date.strftime('%Y-%m-%d %H:%M') if dm_approval else 'N/A',
            'dm_remarks': dm_approval.remarks if dm_approval else 'No remarks',
            'dm_responses_count': dm_responses_count,
            'edcs_user': edcs_user.name,
            'edcs_tehsil': edcs_user.tehsil,
            'status': status_display
        })

    return jsonify({'success': True, 'cases': cases_data})

@app.route('/dm/get-checklist/<int:case_id>')
@login_required
def dm_get_checklist(case_id):
    if current_user.role != 'DM':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        checklist_responses = DMChecklist.query.filter_by(case_id=case_id).all()
        
        responses_data = []
        for response in checklist_responses:
            responses_data.append({
                'question_number': response.question_number,
                'question_text': response.question_text,
                'dm_response': response.dm_response,
                'dm_remarks': response.dm_remarks,
                'created_at': response.created_at.strftime('%Y-%m-%d %H:%M:%S') if response.created_at else None
            })
        
        return jsonify({
            'success': True,
            'responses': responses_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/bcc/save-checklist', methods=['POST'])
@login_required
def bcc_save_checklist():
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        case_id = request.form.get('case_id')
        checklist_type = request.form.get('checklist_type')
        responses = json.loads(request.form.get('responses'))
        
        # Delete existing BCC responses for this case
        BCCChecklist.query.filter_by(case_id=case_id).delete()
        
        # Save new responses
        for i, response in enumerate(responses):
            bcc_response = BCCChecklist(
                case_id=case_id,
                question_number=i + 1,
                question_text=response['question'],
                bcc_response=response['response'],
                bcc_remarks=response['remarks'],
                created_by=current_user.id
            )
            db.session.add(bcc_response)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'BCC checklist saved successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})


@app.route('/bcc/save-checklist', methods=['POST'])
@login_required
def save_bcc_checklist():
    if current_user.role != 'BCCO':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        data = request.get_json()
        case_id = data.get('case_id')
        bcc_responses = data.get('bcc_responses', [])
        
        # Delete existing BCC responses for this case
        BCCChecklist.query.filter_by(case_id=case_id).delete()
        
        # Save new BCC responses
        for response in bcc_responses:
            bcc_checklist = BCCChecklist(
                case_id=case_id,
                question_number=response['question_number'],
                bcc_response=response['bcc_response'],
                bcc_remarks=response['bcc_remarks'],
                created_by=current_user.id
            )
            db.session.add(bcc_checklist)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'BCC checklist saved successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/bcc/case-with-dm-responses/<int:case_id>')
@login_required
def bcc_case_with_dm_responses(case_id):
    if current_user.role != 'BCC_OFFICER':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        # Get case details
        case = Case.query.get(case_id)
        if not case or case.assigned_to_bcc_officer != current_user.id:
            return jsonify({'success': False, 'message': 'Case not found or access denied'})
        
        # Get EDCS details
        edcs_details = EDCSUserDetails.query.filter_by(case_id=case_id).first()
        
        # Get DM checklist responses
        dm_responses = DMChecklist.query.filter_by(case_id=case_id).all()
        dm_checklist_data = []
        for dm_resp in dm_responses:
            dm_checklist_data.append({
                'question_number': dm_resp.question_number,
                'question_text': dm_resp.question_text,
                'dm_response': dm_resp.dm_response,
                'dm_remarks': dm_resp.dm_remarks,
                'created_at': dm_resp.created_at.strftime('%Y-%m-%d %H:%M')
            })
        
        # Get form data based on land type
        form_data = {}
        if case.land_type == 'State Land':
            state_form = StateLandForm.query.filter_by(case_id=case_id).first()
            if state_form:
                for column in state_form.__table__.columns:
                    if column.name not in ['id', 'case_id', 'created_at', 'updated_at']:
                        form_data[column.name] = getattr(state_form, column.name)
        elif case.land_type == 'Voluntary Land Donation':
            vld_form = VLDChecklistForm.query.filter_by(case_id=case_id).first()
            if vld_form:
                for column in vld_form.__table__.columns:
                    if column.name not in ['id', 'case_id', 'created_at', 'updated_at']:
                        form_data[column.name] = getattr(vld_form, column.name)
        
        return jsonify({
            'success': True,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'status': case.status,
            'edcs_data': edcs_details.__dict__ if edcs_details else {},
            'dm_checklist': dm_checklist_data,
            'form_data': form_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})


# ==================== BCCSP ROUTES ====================

@app.route('/bccsp/notifications')
@login_required
def bccsp_notifications():
    if current_user.role != 'BCCSP':
        return jsonify({'success': False, 'message': 'Access denied'})

    notifications = Notification.query.filter_by(
        recipient_id=current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()

    notifications_data = []
    for notification in notifications:
        case = Case.query.get(notification.case_id) if notification.case_id else None
        notifications_data.append({
            'id': notification.id,
            'message': notification.message,
            'type': notification.notification_type,
            'case_number': case.case_number if case else 'N/A',
            'created_at': notification.created_at.strftime('%Y-%m-%d %H:%M'),
            'is_read': notification.is_read
        })

    return jsonify({
        'success': True,
        'notifications': notifications_data
    })

@app.route('/bccsp/case-checklist-data/<int:case_id>')
@login_required
def bccsp_case_checklist_data(case_id):
    if current_user.role != 'BCCSP':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        case = Case.query.get_or_404(case_id)

        # Set case as being reviewed by current BCCSP
        case.reviewing_by_bcc_specialist = current_user.id
        db.session.commit()

        # Get EDCS details
        edcs_details = EDCSUserDetails.query.filter_by(case_id=case_id).first()
        if not edcs_details:
            return jsonify({'success': False, 'message': 'EDCS details not found'})

        # Get form data based on land type
        edcs_data = {}
        if case.land_type == 'State Land':
            state_form = StateLandForm.query.filter_by(case_id=case_id).first()
            if state_form:
                edcs_data = {
                    'option_number': state_form.option_number,
                    'state_land_available': state_form.state_land_available,
                    'community_land_available': state_form.community_land_available,
                    'land_type': state_form.land_type,
                    'category_jointly_recognized': state_form.category_jointly_recognized,
                    'land_area': str(state_form.land_area) if state_form.land_area else 'N/A',
                    'ownership_allotment_name': state_form.ownership_allotment_name,
                    'department_title': state_form.department_title,
                    'fard_malkiyat_file': state_form.fard_malkiyat_file,
                    'legal_encumbrance': state_form.legal_encumbrance,
                    'social_legal_dispute': state_form.social_legal_dispute,
                    'mutation_possible': state_form.mutation_possible,
                    'department_noc_willing': state_form.department_noc_willing,
                    'noc_requisition_file': state_form.noc_requisition_file,
                    'revenue_dept_allows': state_form.revenue_dept_allows,
                    'revenue_requisition_file': state_form.revenue_requisition_file,
                    'structure_assets_cost': str(state_form.structure_assets_cost) if state_form.structure_assets_cost else 'N/A',
                    'livelihood_impact': state_form.livelihood_impact,
                    'relocation_involved': state_form.relocation_involved,
                    'dc_value': str(state_form.dc_value) if state_form.dc_value else 'N/A',
                    'market_value': str(state_form.market_value) if state_form.market_value else 'N/A',
                    'consultation_meeting_conducted': state_form.consultation_meeting_conducted,
                    'vo_consent': state_form.vo_consent,
                    'vo_consent_file': state_form.vo_consent_file,
                    'neighbors_consent': state_form.neighbors_consent,
                    'neighbors_consent_file': state_form.neighbors_consent_file,
                    'grm_process_explained': state_form.grm_process_explained,
                    'land_viable': state_form.land_viable,
                    'provisions_relaxation_needed': state_form.provisions_relaxation_needed,
                    'relaxation_numbers': state_form.relaxation_numbers,
                    'rationale_for_relaxation': state_form.rationale_for_relaxation,
                    'implications_of_relaxation': state_form.implications_of_relaxation,
                    'mitigation_of_implications': state_form.mitigation_of_implications,
                    'relevant_proofs_file': state_form.relevant_proofs_file
                }
        elif case.land_type == 'Voluntary Land Donation':
            vld_form = VLDChecklistForm.query.filter_by(case_id=case_id).first()
            if vld_form:
                edcs_data = {
                    'option_number': vld_form.option_number,
                    'state_land_available': vld_form.state_land_available,
                    'community_land_available': vld_form.community_land_available,
                    'vld_reasons': vld_form.vld_reasons,
                    'comparative_analysis': vld_form.comparative_analysis,
                    'cost_analysis': vld_form.cost_analysis,
                    'donor_vulnerable_group': vld_form.donor_vulnerable_group,
                    'donor_poverty_line': vld_form.donor_poverty_line,
                    'female_head_household': vld_form.female_head_household,
                    'land_type': vld_form.land_type,
                    'category_jointly_recognized': vld_form.category_jointly_recognized,
                    'land_area_donated': str(vld_form.land_area_donated) if vld_form.land_area_donated else 'N/A',
                    'donor_name': vld_form.donor_name,
                    'donor_gender': vld_form.donor_gender,
                    'landholding_title': vld_form.landholding_title,
                    'fard_malkiyat_file': vld_form.fard_malkiyat_file,
                    'land_on_donor_name': vld_form.land_on_donor_name,
                    'land_pledged': vld_form.land_pledged,
                    'legal_encumbrance': vld_form.legal_encumbrance,
                    'social_legal_dispute': vld_form.social_legal_dispute,
                    'mutation_possible': vld_form.mutation_possible,
                    'donor_willing_mutation': vld_form.donor_willing_mutation,
                    'affidavit_file': vld_form.affidavit_file,
                    'land_leased': vld_form.land_leased,
                    'lessor_impact_cost': str(vld_form.lessor_impact_cost) if vld_form.lessor_impact_cost else 'N/A',
                    'total_landholding': str(vld_form.total_landholding) if vld_form.total_landholding else 'N/A',
                    'total_donations_fard_file': vld_form.total_donations_fard_file,
                    'structure_assets_cost': str(vld_form.structure_assets_cost) if vld_form.structure_assets_cost else 'N/A',
                    'holdings_more_2_kanal': vld_form.holdings_more_2_kanal,
                    'holdings_more_25_kanal': vld_form.holdings_more_25_kanal,
                    'livelihood_impact': vld_form.livelihood_impact,
                    'relocation_involved': vld_form.relocation_involved,
                    'donation_percentage': str(vld_form.donation_percentage) if vld_form.donation_percentage else 'N/A',
                    'dc_value': str(vld_form.dc_value) if vld_form.dc_value else 'N/A',
                    'market_value': str(vld_form.market_value) if vld_form.market_value else 'N/A',
                    'consultation_meeting_conducted': vld_form.consultation_meeting_conducted,
                    'vo_consent': vld_form.vo_consent,
                    'vo_consent_file': vld_form.vo_consent_file,
                    'neighbors_consent': vld_form.neighbors_consent,
                    'neighbors_consent_file': vld_form.neighbors_consent_file,
                    'grm_process_explained': vld_form.grm_process_explained,
                    'donor_knows_no_rights': vld_form.donor_knows_no_rights,
                    'donor_knows_equal_access': vld_form.donor_knows_equal_access,
                    'donor_willing_pay_taxes': vld_form.donor_willing_pay_taxes,
                    'land_viable': vld_form.land_viable,
                    'provisions_relaxation_needed': vld_form.provisions_relaxation_needed,
                    'relaxation_numbers': vld_form.relaxation_numbers,
                    'rationale_for_relaxation': vld_form.rationale_for_relaxation,
                    'implications_of_relaxation': vld_form.implications_of_relaxation,
                    'mitigation_of_implications': vld_form.mitigation_of_implications,
                    'relevant_proofs_file': vld_form.relevant_proofs_file
                }

        # Get DM responses
        dm_responses = {}
        dm_checklist = DMChecklist.query.filter_by(case_id=case_id).all()
        for dm_item in dm_checklist:
            dm_responses[f'question_{dm_item.question_number}'] = dm_item.dm_response or 'N/A'

        # Get BCC responses
        bcc_responses = {}
        bcc_checklist = BCCChecklist.query.filter_by(case_id=case_id).all()
        for bcc_item in bcc_checklist:
            bcc_responses[f'question_{bcc_item.question_number}'] = {
                'bcc_response': bcc_item.bcc_response or 'N/A',
                'bcc_remarks': bcc_item.bcc_remarks or ''
            }

        # Get TM responses
        tm_responses = {}
        tm_checklist = TMChecklist.query.filter_by(case_id=case_id).all()
        for tm_item in tm_checklist:
            tm_responses[f'question_{tm_item.question_number}'] = {
                'tm_response': tm_item.tm_response or 'N/A',
                'tm_remarks': tm_item.tm_remarks or ''
            }

        # Get existing BCCSP responses
        bccsp_responses = {}
        bccsp_checklist = BCCSPChecklist.query.filter_by(case_id=case_id).all()
        for bccsp_item in bccsp_checklist:
            bccsp_responses[f'question_{bccsp_item.question_number}'] = {
                'bccsp_response': bccsp_item.bccsp_response or '',
                'bccsp_remarks': bccsp_item.bccsp_remarks or ''
            }

        return jsonify({
            'success': True,
            'case_number': case.case_number,
            'land_type': case.land_type,
            'edcs_data': edcs_data,
            'dm_responses': dm_responses,
            'bcc_responses': bcc_responses,
            'tm_responses': tm_responses,
            'bccsp_responses': bccsp_responses
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/bccsp/save-checklist-responses', methods=['POST'])
@login_required
def bccsp_save_checklist_responses():
    if current_user.role != 'BCCSP':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        data = request.get_json()
        case_id = data.get('case_id')
        bccsp_responses = data.get('bccsp_responses', [])

        if not case_id:
            return jsonify({'success': False, 'message': 'Case ID is required'})

        case = Case.query.get_or_404(case_id)

        # Delete existing BCCSP checklist responses for this case to avoid duplicates
        BCCSPChecklist.query.filter_by(case_id=case_id).delete()

        # Save each BCCSP response
        for response in bccsp_responses:
            bccsp_checklist = BCCSPChecklist(
                case_id=case_id,
                question_number=response.get('question_number'),
                question_text=response.get('question_text', ''),
                bccsp_response=response.get('bccsp_response'),
                bccsp_remarks=response.get('bccsp_remarks'),
                created_by=current_user.id
            )
            db.session.add(bccsp_checklist)

        db.session.commit()

        return jsonify({'success': True, 'message': 'BCCSP checklist responses saved successfully'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/bccsp/process-case', methods=['POST'])
@login_required
def bccsp_process_case():
    if current_user.role != 'BCCSP':
        return jsonify({'success': False, 'message': 'Access denied'})

    try:
        data = request.get_json()
        case_id = data.get('case_id')
        action = data.get('action')
        remarks = data.get('remarks', '')

        if not case_id or not action:
            return jsonify({'success': False, 'message': 'Missing required fields'})

        case = Case.query.get_or_404(case_id)

        # Get checklist summary
        bccsp_checklist = BCCSPChecklist.query.filter_by(case_id=case_id).all()
        checklist_summary = '\n\nBCCSP Checklist Summary:\n'
        for item in bccsp_checklist:
            if item.bccsp_response or item.bccsp_remarks:
                checklist_summary += f'Q{item.question_number}: {item.bccsp_response} - {item.bccsp_remarks}\n'

        if action == 'approve':
            # Final approval - case is complete
            case.current_stage = 'COMPLETED'
            case.status = 'approved_by_bccsp'
            case.reviewing_by_bcc_specialist = None  # Clear reviewing status

            # Create completion record
            completed_request = CompletedRequest(
                case_id=case_id,
                completed_by=current_user.id,
                final_status='APPROVED',
                remarks=f'Approved by BCCSP {current_user.name}: {remarks}{checklist_summary}',
                completion_date=datetime.utcnow()
            )
            db.session.add(completed_request)

            # Create case history
            case_history = CaseHistory(
                case_id=case_id,
                action='APPROVED',
                performed_by=current_user.id,
                comments=f'Final approval by BCCSP: {remarks}'
            )
            db.session.add(case_history)

            # Notify EDCS user
            notification = Notification(
                case_id=case_id,
                recipient_id=case.edcs_user_id,
                sender_id=current_user.id,
                message=f'Case {case.case_number} has been APPROVED by BCCSP {current_user.name}',
                notification_type='APPROVED'
            )
            db.session.add(notification)

        elif action == 'reject':
            case.current_stage = 'REJECTED'
            case.status = 'rejected_by_bccsp'
            case.reviewing_by_bcc_specialist = None

            # Create completion record
            completed_request = CompletedRequest(
                case_id=case_id,
                completed_by=current_user.id,
                final_status='REJECTED',
                remarks=f'Rejected by BCCSP {current_user.name}: {remarks}{checklist_summary}',
                completion_date=datetime.utcnow()
            )
            db.session.add(completed_request)

            # Create case history
            case_history = CaseHistory(
                case_id=case_id,
                action='REJECTED',
                performed_by=current_user.id,
                comments=f'Rejected by BCCSP: {remarks}'
            )
            db.session.add(case_history)

            # Notify EDCS user
            notification = Notification(
                case_id=case_id,
                recipient_id=case.edcs_user_id,
                sender_id=current_user.id,
                message=f'Case {case.case_number} has been REJECTED by BCCSP {current_user.name}',
                notification_type='REJECTED'
            )
            db.session.add(notification)

        elif action == 'return':
            # Return to TM
            case.current_stage = 'TM'
            case.status = 'returned_by_bccsp'
            case.reviewing_by_bcc_specialist = None

            # Find the TM to return to
            # First try assigned_to_tm, then try to find TM who last reviewed this case
            tm_user_id = case.assigned_to_tm
            if not tm_user_id:
                # Try to find TM from TMChecklist
                tm_checklist = TMChecklist.query.filter_by(case_id=case_id).first()
                if tm_checklist:
                    tm_user_id = tm_checklist.created_by
                else:
                    # If still not found, find any TM user as fallback
                    tm_user = User.query.filter_by(role='TM').first()
                    if tm_user:
                        tm_user_id = tm_user.id
                        case.assigned_to_tm = tm_user_id  # Assign for future reference

            if not tm_user_id:
                return jsonify({'success': False, 'message': 'No TM found to return the case to'})

            # Create returned form record
            returned_form = ReturnedForm(
                case_id=case_id,
                returned_by=current_user.id,
                returned_to=tm_user_id,
                reason=f'{remarks}{checklist_summary}',
                stage_returned_from='BCCSP',
                returned_at=datetime.utcnow()
            )
            db.session.add(returned_form)

            # Create case history
            case_history = CaseHistory(
                case_id=case_id,
                action='RETURNED',
                performed_by=current_user.id,
                comments=f'Returned to TM by BCCSP: {remarks}'
            )
            db.session.add(case_history)

            # Notify TM
            notification = Notification(
                case_id=case_id,
                recipient_id=tm_user_id,
                sender_id=current_user.id,
                message=f'Case {case.case_number} returned by BCCSP {current_user.name} for revision',
                notification_type='RETURNED'
            )
            db.session.add(notification)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Case {action}d successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/bccsp/my-submissions')
@login_required
def bccsp_my_submissions():
    if current_user.role != 'BCCSP':
        return jsonify({'error': 'Unauthorized'}), 403

    # Get all cases processed by this BCCSP
    processed_cases = db.session.query(Case, CompletedRequest, User).join(
        CompletedRequest, Case.case_id == CompletedRequest.case_id
    ).join(
        User, Case.edcs_user_id == User.id
    ).filter(
        CompletedRequest.completed_by == current_user.id
    ).order_by(CompletedRequest.completion_date.desc()).all()

    submissions_data = []
    for case, completed_request, edcs_user in processed_cases:
        submissions_data.append({
            'case_id': case.case_id,
            'case_number': case.case_number,
            'land_type': case.land_type or 'N/A',
            'edcs_user': edcs_user.name,
            'action_date': completed_request.completion_date.strftime('%Y-%m-%d %H:%M'),
            'status': completed_request.final_status
        })

    # Sort by action date (most recent first)
    submissions_data.sort(key=lambda x: x['action_date'], reverse=True)

    return jsonify({
        'success': True,
        'submissions': submissions_data
    })

if __name__ == '__main__':
    with app.app_context():
        try:
            # Create all database tables
            db.create_all()
            print("✅ Database and tables created successfully!")

            # Optionally create an admin user if it doesn't exist
            admin_user = User.query.filter_by(email='admin@admin.com').first()
            if not admin_user:
                admin = User(
                    name='System Administrator',
                    email='admin@admin.com',
                    phone='1234567890',
                    birth_date=datetime(1990, 1, 1).date(),
                    gender='Male',
                    region='Admin Region',
                    district='Admin District',
                    tehsil='Admin Tehsil',
                    address_line1='Admin Address',
                    postal_code='00000',
                    designation='System Administrator',
                    department='IT Department',
                    role='admin'
                )
                admin.set_password('admin123')
                db.session.add(admin)
                db.session.commit()
                print("✅ Admin user created (admin@admin.com / admin123)")

        except Exception as e:
            print(f"❌ Database setup error: {e}")

    app.run(debug=True)
