from flask import Flask, jsonify, request, render_template, redirect, url_for, send_from_directory

import os
from models import Company, Student, db, User, Role
from werkzeug.security import generate_password_hash 
app = Flask(__name__)


app.config['SECRET_KEY'] = 'placeiitm_secret_sidd'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///placeiitm.db' 
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(
    os.path.dirname(__file__), 'static', 'uploads', 'resumes'
)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER']) 

db.init_app(app)

def init_db():
    with app.app_context():
        db.create_all()
        
        if not User.query.filter_by(role=Role.Admin_role).first():
            print("No Admin found. Initializing default Admin account...")
            hashed_pw = generate_password_hash(
                'Siddharth@300', method='pbkdf2:sha256', salt_length=8
                ) 
            
            admin_user = User(
                username='siddharth_admin',
                email='siddharth@placeiitm.ac.in', 
                passwd=hashed_pw, 
                role=Role.Admin_role,
                is_blacklisted=False
            )
            db.session.add(admin_user)
            db.session.commit()
            print("Admin created, siddharth@placeiitm.ac.in/Siddharth@300")
        else:
            print("Admin account already exists. Skipping initialization.")



@app.route('/')
def index():
    return "Welcome to the PlaceIITM V2."


@app.route('/api/auth/login', methods=['POST'])
def login():
    body = request.get_json() or {}
    email = body.get('email', '').strip().lower()
    password = body.get('password', '').strip()
    role = body.get('role', '')

    if not all([email, password, role]):
        return jsonify({'error': 'Email, password, and role are required.'}), 400

    user = User.query.filter_by(email=email, role=role).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }), 200

@app.route('/api/auth/refresh', methods=['POST'])
def refresh():
    return jsonify({"message": "Token refreshed successfully"}), 200

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    return jsonify({"message": "Current user information"}), 200

@app.route('/api/auth/register/student', methods=['POST'])
def register_student():
    body = request.get_json() or {}
    username = body.get('username', '').strip()
    email = body.get('email', '').strip().lower()
    passwd = body.get('password', '').strip()
    stu_name = body.get('stu_name', '').strip()
    roll_no = body.get('roll_no', '').strip()
    phone = body.get('phone', '').strip()

    if not all([username, email, passwd, stu_name, roll_no, phone]):
        return jsonify({'error': 'All fields are required.'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered.'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken.'}), 400
    
    user = User(
        username=username,
        email=email,
        passwd=generate_password_hash(passwd, method='pbkdf2:sha256', salt_length=8),
        role='student',
        is_blacklisted=False
    )
    db.session.add(user)
    db.session.flush()

    student = Student(
        user_id=user.id,
        stu_name=stu_name,
        email=email,
        roll_no=roll_no,
        phone=phone,
        department=body.get('department', '').strip() or None,
        degree=body.get('degree', '').strip() or None,
        grad_year=body.get('grad_year', '').strip() or None,
        cgpa=body.get('cgpa', '').strip() or None,
        skills=body.get('skills', '').strip() or None
    )
    db.session.add(student)
    db.session.commit()

    return jsonify({"message": "Student registration successful"}), 201


@app.route('/api/auth/register/company', methods=['POST'])
def register_company():
    body = request.get_json() or {}
    username = body.get('username', '').strip()
    email = body.get('email', '').strip().lower()
    passwd = body.get('password', '').strip()
    company_name = body.get('company_name', '').strip()

    if not all([username, email, passwd, company_name]):
        return jsonify({'error': 'All fields are required.'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered.'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken.'}), 400
    
    user = User(
        username=username,
        email=email,
        passwd=generate_password_hash(passwd, method='pbkdf2:sha256', salt_length=8),
        role='company',
        is_blacklisted=False
    )
    db.session.add(user)
    db.session.flush()

    company = Company(
        user_id=user.id,
        company_name=company_name,
        industry=body.get('industry', '').strip() or None,
        hr_name=body.get('hr_name', '').strip() or None,
        hr_contact=body.get('hr_contact', '').strip() or None,
        website=body.get('website', '').strip() or None,
        description=body.get('description', '').strip() or None,
        location=body.get('location', '').strip() or None
    )
    db.session.add(company)
    db.session.commit()


    return jsonify({"message": "Company registration successful"}), 201

@app.route('/api/admin/dashboard', methods=['GET'])
def admin_dashboard():
    return jsonify({"message": "Admin dashboard accessed successfully"}), 200

@app.route('/api/company/dashboard', methods=['GET'])
def company_dashboard():
    return jsonify({"message": "Company dashboard accessed successfully"}), 200


@app.route('/api/student/dashboard', methods=['GET'])
def student_dashboard():
    return jsonify({"message": "Student dashboard accessed successfully"}), 200


if __name__ == '__main__':
    init_db()
    app.run(debug=True)
