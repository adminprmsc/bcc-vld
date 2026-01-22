from app import app, db
from database.models import User, EDCSUserDetails, EDCSStateLandOption
from datetime import datetime

def init_database():
    with app.app_context():
        # Only drop and recreate if tables don't exist or if explicitly requested
        # This preserves real user registrations while ensuring test users exist
        db.create_all()
        
        # Create test users only if they don't exist
        test_users = [
            ('admin@admin.com', 'System Administrator', 'admin123', 'admin'),
            ('edcs@test.com', 'EDCS Test User', '123456', 'EDCS'),
            ('bcco@test.com', 'BCCO Test User', '123456', 'BCCO'),
            ('bccsp@test.com', 'BCCSP Test User', '123456', 'BCCSP'),
            ('tm@test.com', 'TM Test User', '123456', 'TM'),
            ('dm@test.com', 'DM Test User', '123456', 'DM')
        ]
        
        for email, name, password, role in test_users:
            existing_user = User.query.filter_by(email=email).first()
            if not existing_user:
                user = User(
                    name=name,
                    email=email,
                    phone='1234567890',
                    birth_date=datetime(1985, 5, 15).date(),
                    gender='Male',
                    region='Test Region',
                    district='Test District',
                    tehsil='Test Tehsil',
                    address_line1='Test Address',
                    postal_code='12345',
                    designation=f'{role} Consultant',
                    department='Test Department',
                    role=role
                )
                user.set_password(password)
                db.session.add(user)
        
        db.session.commit()
        print("Database initialized with test users!")

if __name__ == '__main__':
    init_database()


