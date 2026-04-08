
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

    # os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    # os.makedirs(app.config['EXPORT_FOLDER'], exist_ok=True)

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






    @app.route('/api/auth/login', methods=['POST'])
    def login():
        body = request.get_json() or {}
        email = body.get('email', '').strip().lower()
        passwd = body.get('passwd', '').strip()
        role = body.get('role', '')

        if not all([email, passwd, role]):
            return err("Oh-ho, Email, password and role are required.")
        
        if role not in Role.ALL:
            return err("Heyyy, Invalid role. Please choose from: " + ", ".join(Role.ALL))
        
        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(passwd):
            return err("Invalid credentials. Please check your email, password, and role.", 401)

        if user.role != role:
            return err(f"You selected '{role}'. but your account is registered as '{user.role}'.", 401)
        
        if user.is_blacklisted:
            return err("Sorry, Your account has been blacklisted. Please contact to placement cell.", 403)
        
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        profile = None
        if user.is_student() and user.student_profile:
            profile = {
                'stu_name': user.student_profile.stu_name, 
                'roll_no': user.student_profile.roll_no
                }
        elif user.is_company() and user.company_profile:
            profile = {
                'company_name': user.company_profile.company_name,
                'approval_status': user.company_profile.approval_status
                }
            
        

        return ok({
            'access_token': access_token,
            'refresh_token': refresh_token,
            "message": "Login successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "profile": profile
            }
        }, f'Welcome back sir, {user.username}!!'), 200

    @app.route('/api/auth/refresh', methods=['POST'])
    @jwt_required(refresh=True)
    def refresh():      
        user_id = get_jwt_identity()
        access_token = create_access_token(identity=user_id)
        return ok({"access_token": access_token}, "Token refreshed successfully"), 200
            

    @app.route('/api/auth/me', methods=['GET'])
    @jwt_required()
    def me():
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return err("User not found", 404)
        
        return ok(user.to_dict()), 200
    



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
            return err('oHH-HOO, Username, email, password, full name and roll number are required.'), 400
        
        if len(passwd) < 6:
            return err('Password must be at least 6 characters long.'), 400
        
        if User.query.filter_by(email=email).first():
            return err('Email already registered.'), 400
        
        if User.query.filter_by(username=username).first():
            return err('Username already taken.'), 400
        
        if Student.query.filter_by(roll_no=roll_no).first():
            return err('Ohh, A student with this roll number is already registered.'), 400
        
        user = User(
            username=username,
            email=email,
            role=Role.Student_role,
        )
        user.set_password(passwd)
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
            cgpa=safe_float(body.get('cgpa', '').strip() or None),
            skills=body.get('skills', '').strip() or None
        )
        db.session.add(student)
        db.session.commit()

        return ok(message= "Dear Student, Hurrayy your registration successful", status_code=201)


    @app.route('/api/auth/register/company', methods=['POST'])
    def register_company():
        body = request.get_json() or {}

        username = body.get('username', '').strip()
        email = body.get('email', '').strip().lower()
        passwd = body.get('password', '').strip()
        company_name = body.get('company_name', '').strip()

        if not all([username, email, passwd, company_name]):
            return err('ohh-hoo, Username, email, password and company name are required.'), 400
        
        if len(passwd) < 6:
            return err('Password must be at least 6 characters long.'), 400
        
        if User.query.filter_by(email=email).first():
            return err('Email already registered.'), 400
        
        if User.query.filter_by(username=username).first():
            return err('This Username already taken sir.'), 400
        
        user = User(
            username=username,
            email=email,
            role=Role.Company_role,
        )
        user.set_password(passwd)
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


        return ok(message="Company registration successful!! Please wait for admin approval befor posting any drives", status_code=201)

    @app.route('/api/admin/dashboard', methods=['GET'])
    @admin_required
    def admin_dashboard():
        total_students = Student.query.count()
        total_companies = Company.query.count()
        total_drives = PlacementDrive.query.count()
        total_apps = Application.query.count()
        total_selected = Application.query.filter_by(status=AppStatus.Selected_app).count()
        pending_cos = Company.query.filter_by(approval_status=CompanyStatus.Pending_status).count()
        pending_drives = PlacementDrive.query.filter_by(status=DriveStatus.Pending_status).count()

        recent_apps = (Application.query
                       .join(Student).join(PlacementDrive).join(Company)
                       .order_by(Application.applied_at.desc())
                       .limit(10).all())
        
        recent_companies = Company.query.order_by(Company.registered_at.desc()).limit(6).all()

        return ok({
            'stats ': {
                "total_students": total_students,
                "total_companies": total_companies,
                "total_drives": total_drives,
                "total_apps": total_apps,
                "total_selected": total_selected,
                "pending_cos": pending_cos,
                "pending_drives": pending_drives,
            },
            "recent_apps": [app.to_dict() for app in recent_apps],
            "recent_companies": [co.to_dict() for co in recent_companies]
        }, "Admin dashboard data fetched successfully"), 200

    @app.route('/api/admin/companies', methods=['GET'])
    @admin_required
    def admin_get_companies():
        companies = Company.query.order_by(Company.registered_at.desc()).all()
        return ok([co.to_dict() for co in companies], "Companies fetched successfully"), 200
    
    @app.route('/api/admin/companies/<int:co_id>/approve', methods=['POST'])
    @admin_required
    def admin_approve_company(co_id):
        return 'Company approval endpoint - to be implemented', 200
    
    
    

    @app.route('/api/company/dashboard', methods=['GET'])
    def company_dashboard():
        return jsonify({"message": "Company dashboard accessed successfully"}), 200


    @app.route('/api/student/dashboard', methods=['GET'])
    def student_dashboard():
        return jsonify({"message": "Student dashboard accessed successfully"}), 200

app = create_app()


