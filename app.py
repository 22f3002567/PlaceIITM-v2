from curses import wrapper

from flask import Flask, jsonify, request, render_template, redirect, url_for, send_from_directory

import os
from werkzeug.security import generate_password_hash 

from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from sqlalchemy import or_


from config import Config
from extensions import db, jwt, cors

from models import (db, User, Student, Company, PlacementDrive, Application, ExportJob,
                    Role, CompanyStatus, DriveStatus, AppStatus, ExportStatus,
                    )

from functools import wraps

def create_app():
    app = Flask(
        __name__, 
        template_folder='templates', 
        static_folder='static'
    )
    app.config.from_object(Config)

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['EXPORT_FOLDER'], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})


    with app.app_context():
        db.create_all()
        _seed_admin(app)

    _register_routes(app)

    return app



def _seed_admin(app):
    if not User.query.filter_by(role=Role.Admin_role).first():
        admin = User(
            username='siddharth_admin',
            email=app.config.get('ADMIN_EMAIL', 'siddharth@placeiitm.ac.in'),
            role=Role.Admin_role,
            is_active = True
        )
        admin.set_password("Siddharth@300")
        db.session.add(admin)
        db.session.commit()
        print(f"\n Admin seeded successfully {admin.email}/ Siddharth@300 \n")
    else:
        print("\n Admin account already exists. Skipping seeding. \n")


def ok(data=None, message='', status_code=200):
    response = {
        'success': True,
        'data': None if data is None else data,
        'message': message
    }
    return jsonify(response), status_code

def err(message='Someting Went Wrong', status_code=400):
    response = {
        'success': False,
        'data': None,
        'message': message
    }
    return jsonify(response), status_code

def safe_float(value, min_val=0.0, max_val=10.0):
    try:
        v = float(value)
        return v if min_val <= v <= max_val else None
    except (ValueError, TypeError):
        return None
    
def safe_int(value):
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_admin():
            return err("Heyyy pleasee, Admin access required", 403)
        
        if not user.is_active:
            return err("Opppsss, Your account has be deactivated. Please contact support.", 403)
        
        return f(*args, **kwargs)
    return decorated


def company_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_company():
            return err("Sirrr, Company access required", 403)
        
        if not user.is_active or user.is_blacklisted:
            return err("Opppsss, Your account has be deactivated. Please contact support.", 403)
        return f(*args, **kwargs)
    return decorated

def student_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_student():
            return err("Heyyy dear, Student access required", 403)
        
        if not user.is_active or user.is_blacklisted:
            return err("Opppsss, Your account has be deactivated. Please contact support.", 403)
        return f(*args, **kwargs)
    return decorated


def _register_routes(app):

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_vue_app(path):
        if path.startswith('api/') or path.startswith('static/'):
            from flask import abort
            abort(404)
        return render_template('index.html')





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
