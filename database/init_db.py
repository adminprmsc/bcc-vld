from flask import Flask
from database.models import db, User
import os

def init_database():
    """Initialize the database with tables and sample data"""
    
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///land_donation.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Create admin user if doesn't exist
        admin_user = User.query.filter_by(email='admin@landdonation.com').first()
        if not admin_user:
            admin = User(
                name='System Administrator',
                email='admin@landdonation.com',
                phone='+1234567890',
                birth_date='1990-01-01',
                gender='Other',
                region='Central',
                district='Admin District',
                tehsil='Admin Tehsil',
                address_line1='System Address',
                postal_code='00000',
                designation='System Administrator',
                department='IT Department',
                role='admin',
                is_verified=True,
                email_verified=True
            )
            admin.set_password('admin123')  # Change this in production
            
            db.session.add(admin)
            db.session.commit()
            print("Admin user created successfully!")
        
        print("Database initialized successfully!")

if __name__ == '__main__':
    init_database()