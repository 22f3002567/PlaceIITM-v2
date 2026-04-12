
from flask import Flask, jsonify, request, render_template, redirect, url_for, send_from_directory

import os
import csv, io as _io
import re
from datetime import date, datetime
from functools import wraps
from flask import abort

from werkzeug.security import generate_password_hash 
from werkzeug.utils import secure_filename
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from sqlalchemy import or_
from celery.schedules import crontab
from sqlalchemy.exc import IntegrityError

from config import Config
from extensions import db, jwt, cors, celery, mail, cache

from models import (User, Student, Company, PlacementDrive, Application, ExportJob,
                    Role, CompanyStatus, DriveStatus, AppStatus, ExportStatus,
                    DEPARTMENTS, DEGREES, INDUSTRIES, JOB_TYPES
                    )


def create_app():
    app = Flask(
        __name__, 
        template_folder='templates', 
        static_folder='static'
    )
    app.config.from_object(Config)

    # it makes sure that upload and export folders exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['EXPORT_FOLDER'], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    cache.init_app(app)
    mail.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    celery.conf.update(
        broker_url=app.config['CELERY_BROKER_URL'],
        result_backend=app.config['CELERY_RESULT_BACKEND'],
        task_serializer='json',
        result_serializer='json',
        accept_content=['json'],
        timezone='Asia/Kolkata',
        enable_utc=True,
        beat_schedule={
            'daily-deadline-reminder': {
                'task': 'tasks.send_deadline_reminders',
                # 'schedule': 86400.0,  # every 24 hours
                'schedule': crontab(hour=8, minute=0),   # 8:00 AM IST every day
            },
            'monthly-activity-report': {
                'task': 'tasks.send_monthly_report',
                # 'schedule': 2592000.0,  # every 30 days
                'schedule': crontab(day_of_month=1, hour=9, minute=0),  # 9 AM on 1st of month
            },
        }
    )

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    celery.Task = ContextTask

    with app.app_context():
        os.makedirs(os.path.join(app.root_path, 'instance'), exist_ok=True)
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
            is_active=True
        )
        admin.set_password('Siddharth@300')
        db.session.add(admin)
        db.session.commit()
        print(f"\n Hurraaayyy.. Admin seeded successfully {admin.email}/ Siddharth@300 \n")
    else:
        print("\n Admin account already exists. Skipping seeding. \n")


# helper functions

def ok(data=None, message='', status=200):
    response = {
        'success': True,
        # 'data': None if data is None else data,
        'data' : data,
        'message': message
    }
    return jsonify(response), status

def err(message='Someting Went Wrong', status=400):

    return jsonify({'success': False, 'data': None, 'message': message}), status

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS



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


#Passward Validators 
def validate_password(passwd):
    #Returns error string or None if valid.
    if len(passwd) < 8:
        return 'Password must be at least 8 characters.'
    if not re.search(r'[A-Z]', passwd):
        return 'Password must contain at least one uppercase letter.'
    if not re.search(r'[a-z]', passwd):
        return 'Password must contain at least one lowercase letter.'
    if not re.search(r'\d', passwd):
        return 'Password must contain at least one digit.'
    if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>?/\\|`~]', passwd):
        return 'Password must contain at least one special character.'
    return None


#Targeted cache invalidation (pahele  was cache.clear() everywhere)

def _invalidate_drives_cache():
    # Call this whenever a drive is approved, rejected, or closed.
    try:
        cache.delete('open_drives')
    except Exception:
        pass

def _invalidate_dashboard_cache():
    # Call this whenever counts change (approvals, new users, etc.).
    try:
        cache.delete('admin_dashboard')
        cache.delete('admin_stats')
    except Exception:
        pass



# Role decorators

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = int(get_jwt_identity()) # converted to int 
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
        user_id = int(get_jwt_identity())
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
        user_id = int(get_jwt_identity())
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
    def serve_vue(path):
        if path.startswith('api/') or path.startswith('static/'):
            from flask import abort
            abort(404)
        return render_template('index.html')
    

    @app.route('/api/resumes/<path:filename>')
    # @jwt_required()
    def serve_resume(filename):
        filename = secure_filename(filename)
        file_path = os.path.join(Config.UPLOAD_FOLDER, filename)

        if not os.path.exists(file_path):
            abort(404)
        return send_from_directory(Config.UPLOAD_FOLDER, filename)

    @app.route('/api/exports/<path:filename>')
    #@jwt_required()
    def serve_export(filename):
        return send_from_directory(Config.EXPORT_FOLDER, filename)


    # Authentications 


    @app.route('/api/auth/login', methods=['POST'])
    def login():
        body = request.get_json() or {}
        email = body.get('email', '').strip().lower()
        passwd = body.get('password', '').strip()
        role = body.get('role', '')

        if not all([email, passwd, role]):
            return err("Oh-ho, Email, password and role are required.")
        
        if role not in Role.ALL:
            return err("Heyyy, Invalid role. Please choose from: " + ", ".join(Role.ALL))
        
        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(passwd):
            return err("Invalid credentials. Please check your email, password, and role.")


        if user.role != role:
            return err(f"You selected '{role}'. but your account is registered as '{user.role}'.")
        
        if not user.is_active:
            return err("You account is deactivated sir.. Please Contact the Placement cell.")

        if user.is_blacklisted:
            return err("Sorry, Your account has been blacklisted. Please contact to placement cell.")
        
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

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
        }, f'Welcome back sir, {user.username}!!')

    @app.route('/api/auth/refresh', methods=['POST'])
    @jwt_required(refresh=True)
    def refresh():
        user_id = get_jwt_identity()
        access_token = create_access_token(identity=user_id)      
        return ok({"access_token": access_token}, "Token refreshed successfully...")
            

    @app.route('/api/auth/me', methods=['GET'])
    @jwt_required()
    def me():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return err("User not found", 404)
        
        return ok(user.to_dict())
    



    @app.route('/api/auth/register/student', methods=['POST'])
    def register_student():
        body = request.get_json() or {}

        print("RAW BODY:", body)
        print("TYPE:", type(body))

        username = body.get('username', '').strip()
        email = body.get('email', '').strip().lower()
        passwd = body.get('password', '')
        stu_name = body.get('stu_name', '').strip()
        roll_no = body.get('roll_no', '').strip()
        phone = body.get('phone', '').strip()

        if not all([username, email, passwd, stu_name, roll_no]):
            # print("FAILED AT: all field required")

            return err('oHH-HOO, Username, email, password, full name and roll number are required.')
        
        # if len(passwd) < 6:
        #     #print("FAILED AT: passawar length")
        #     return err('Password must be at least 6 characters long.')
        
        pw_err = validate_password(passwd)
        if pw_err:
            return err(pw_err)
        

        # if User.query.filter_by(email=email).first():
        #     #print("FAILED AT: email")
        #     return err('Email already registered.')
        
        # if User.query.filter_by(username=username).first():
        #     #print("FAILED AT: username")
        #     return err('Username already taken.')
        
        # if Student.query.filter_by(roll_no=roll_no).first():
        #     #print("FAILED AT: rollno")
        #     return err('Ohh, A student with this roll number is already registered.')
        
        try:
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
                #grad_year=body.get('graduation_year', '') or None,
                grad_year=safe_int(body.get('graduation_year')),
                
                #cgpa= float(body.get('cgpa', '') or None),
                cgpa = safe_float(body.get('cgpa')),
                skills=body.get('skills', '').strip() or None
            )
            db.session.add(student)
            db.session.commit()

            _invalidate_dashboard_cache()

            return ok(message= "Dear Student, Hurrayy your registration successful", status=201)

        except IntegrityError as e:
            db.session.rollback()
            msg = str(e.orig).lower()
            if 'email' in msg: return err('This email is already registered.')
            if 'roll_no' in msg: return err('This roll number is already registered.')
            if 'username'in msg: return err('This username is already taken.')
            return err('Registration failed. Please try again.')

    @app.route('/api/auth/register/company', methods=['POST'])
    def register_company():
        body = request.get_json() or {}

        username = body.get('username', '').strip()
        email = body.get('email', '').strip().lower()
        passwd = body.get('password', '')
        company_name = body.get('company_name', '').strip()

        if not all([username, email, passwd, company_name]):
            return err('ohh-hoo, Username, email, password and company name are required.')
        
        pw_err = validate_password(passwd)
        if pw_err:
            return err(pw_err)

        # if len(passwd) < 6:
        #     return err('Password must be at least 6 characters long.')
        
        # if User.query.filter_by(email=email).first():
        #     return err('Email already registered.')
        
        # if User.query.filter_by(username=username).first():
        #     return err('This Username already taken sir.')
        
        try: 
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


            return ok(message="Company registration successful!! Please wait for admin approval befor posting any drives", status=201)

        except IntegrityError as e:
            db.session.rollback()
            msg = str(e.orig).lower()
            if 'email' in msg: return err('This email is already registered.')
            if 'username' in msg: return err('This username is already taken.')
            return err('Registration failed. Please try again.')


    @app.route('/api/student/lookups', methods=['GET'])
    def student_lookups():
        return ok({
            'departments': DEPARTMENTS, 
            'degrees': DEGREES, 
            'app_statuses': AppStatus.ALL
        })








    # Admin 

    @app.route('/api/admin/dashboard', methods=['GET'])
    @admin_required
    @cache.cached(timeout=120, key_prefix='admin_dashboard')
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
            'stats': {
                "total_students": total_students,
                "total_companies": total_companies,
                "total_drives": total_drives,
                "total_apps": total_apps,
                "total_selected": total_selected,
                "pending_cos": pending_cos,
                "pending_drives": pending_drives,
            },
            "recent_apps": [a.to_dict() for a in recent_apps],
            "recent_companies": [c.to_dict() for c in recent_companies]
        }, "Admin dashboard data fetched successfully")

    @app.route('/api/admin/companies', methods=['GET'])
    @admin_required
    def admin_get_companies():
        search = request.args.get('search', '').strip()
        status = request.args.get('status', '').strip()

        query = Company.query.join(User)
        if search:
            query = query.filter(or_(
                Company.company_name.ilike(f'%{search}%'),
                Company.industry.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            ))
        if status:
            query = query.filter(Company.approval_status == status)


        companies = query.order_by(Company.registered_at.desc()).all()

        return ok([co.to_dict() for co in companies], "Companies fetched successfully")
    

    
    @app.route('/api/admin/companies/<int:co_id>/approve', methods=['POST'])
    @admin_required
    def admin_approve_company(co_id):

        co = Company.query.get_or_404(co_id)
        co.approval_status = CompanyStatus.Approved_status
        db.session.commit()

        # cache.delete('admin_dashboard')
        _invalidate_dashboard_cache()


        return ok(message=f"'{co.company_name}' hass been approved..")
    
    
    @app.route('/api/admin/companies/<int:co_id>/reject', methods=["POST"])
    @admin_required
    def admin_reject_company(co_id):
        co = Company.query.get_or_404(co_id)
        co.approval_status = CompanyStatus.Rejected_status
        db.session.commit()

        # cache.delete('admin_dashboard')
        _invalidate_dashboard_cache()

        return ok(message=f"'{co.company_name}' has been rejectedd...")
    



    @app.route('/api/admin/companies/<int:co_id>/blacklist', methods=['POST'])
    @admin_required
    def admin_toggle_company_blacklist(co_id):
        co = Company.query.get_or_404(co_id)
        co.user.is_blacklisted = not co.user.is_blacklisted
        db.session.commit()
        action = 'blacklisted' if co.user.is_blacklisted else "unblacklisted"
        return ok(message=f"'{co.company_name}' has been {action}...")
    


    @app.route('/api/admin/companies/<int:co_id>', methods=['DELETE'])
    @admin_required
    def admin_delete_company(co_id):
        co = Company.query.get_or_404(co_id)
        name = co.company_name
        db.session.delete(co.user)
        db.session.commit()
        #cache.delete('admin_dashboard')
        # cache.clear()
        _invalidate_dashboard_cache()
        _invalidate_drives_cache()

        return ok(message=f"'{name}' and all associated data have been  deleted..")
    


    @app.route('/api/admin/companies/<int:co_id>', methods=['PUT'])
    @admin_required
    def admin_edit_company(co_id):

        co = Company.query.get_or_404(co_id)
        body = request.get_json() or {}

        co.company_name = body.get('company_name', co.company_name).strip()
        co.industry = body.get('industry', co.industry)
        co.hr_name = body.get('hr_name', co.hr_name)
        co.hr_contact = body.get('hr_contact', co.hr_contact)
        co.website = body.get('website', co.website)
        co.description = body.get('description', co.description)
        co.location = body.get('location', co.location)
        db.session.commit()
        return ok(co.to_dict(), f"'{co.company_name}' updated successfully..")
    

    @app.route("/api/admin/students", methods=['GET'])
    @admin_required
    def admin_get_students():
        search = request.args.get('search', '').strip()
        dept = request.args.get('department', '').strip()
        grad_year = request.args.get('graduation_year', '').strip()

        query = Student.query.join(User)
        if search:
            query = query.filter(or_(
                Student.stu_name.ilike(f'%{search}%'),
                Student.roll_no.ilike(f'%{search}%'),
                Student.email.ilike(f'%{search}%'),
                Student.phone.ilike(f'%{search}%')
            ))
        
        if dept:
            query = query.filter(Student.department == dept)
        
        if grad_year:
            query = query.filter(Student.grad_year == safe_int(grad_year))

        #students = query.order_by(Student.grad_year == safe_int(grad_year))
        students = query.order_by(Student.registered_at.desc()).all()
        return ok([s.to_dict() for s in students])
    

    @app.route('/api/admin/students/<int:stu_id>', methods=['PUT'])
    @admin_required
    def admin_edit_student(stu_id):
        stu = Student.query.get_or_404(stu_id)
        body = request.get_json() or {}
        stu.stu_name = body.get('stu_name', stu.stu_name).strip()
        stu.phone = body.get('phone', stu.phone)
        stu.department = body.get('department', stu.department)
        stu.degree = body.get('degree', stu.degree)
        stu.grad_year = safe_int(body.get('graduation_year')) or stu.grad_year
        stu.cgpa = safe_float(body.get('cgpa')) or stu.cgpa
        stu.skills = body.get('skills', stu.skills)
        stu.roll_no  = body.get('roll_no', stu.roll_no)
        db.session.commit()
        return ok(stu.to_dict(), f"'{stu.stu_name}' updated succesfully..")


    @app.route('/api/admin/students/<int:stu_id>/blacklist', methods=['POST'])
    @admin_required
    def admin_toggle_student_blacklist(stu_id):
        stu = Student.query.get_or_404(stu_id)
        stu.user.is_blacklisted = not stu.user.is_blacklisted
        db.session.commit()
        action = 'blacklisted' if stu.user.is_blacklisted else 'unblacklisted'
        return ok(message=f"'{stu.stu_name}' has been {action}.")


    @app.route('/api/admin/students/<int:stu_id>', methods=['DELETE'])
    @admin_required
    def admin_delete_student(stu_id):
        stu  = Student.query.get_or_404(stu_id)
        name = stu.stu_name
        db.session.delete(stu.user)
        db.session.commit()
        # cache.delete('admin_dashboard')
        _invalidate_dashboard_cache()

        return ok(message=f"'{name}' and all associated data have deleted.")


    @app.route('/api/admin/drives', methods=['GET'])
    @admin_required
    def admin_get_drives():
        search = request.args.get('search', '').strip()
        status = request.args.get('status', '').strip()

        query = PlacementDrive.query.join(Company)
        if search:
            query = query.filter(or_(
                PlacementDrive.job_title.ilike(f'%{search}%'),
                Company.company_name.ilike(f'%{search}%')
            ))
        if status:
            query = query.filter(PlacementDrive.status == status)

        drives = query.order_by(PlacementDrive.created_at.desc()).all()
        return ok([d.to_dict() for d in drives])


    @app.route('/api/admin/drives/<int:drive_id>/approve', methods=['POST'])
    @admin_required
    def admin_approve_drive(drive_id):
        drive = PlacementDrive.query.get_or_404(drive_id)
        drive.status = DriveStatus.Approved_status
        db.session.commit()
        # cache.delete('admin_dashboard')
        # cache.delete('open_drives')

        _invalidate_drives_cache()
        _invalidate_dashboard_cache()

        return ok(message=f"Drive '{drive.job_title}' approved. Studentss can apply now")


    @app.route('/api/admin/drives/<int:drive_id>/reject', methods=['POST'])
    @admin_required
    def admin_reject_drive(drive_id):
        drive = PlacementDrive.query.get_or_404(drive_id)
        drive.status = DriveStatus.Rejected_status
        db.session.commit()
        # cache.delete('open_drives')
        _invalidate_drives_cache()
    
        return ok(message=f"Drive '{drive.job_title}' has been rejected.")


    @app.route('/api/admin/drives/<int:drive_id>/close', methods=['POST'])
    @admin_required
    def admin_close_drive(drive_id):
        drive = PlacementDrive.query.get_or_404(drive_id)
        drive.status = DriveStatus.Closed_status
        db.session.commit()
        # cache.delete('open_drives')
        _invalidate_drives_cache()
    
        return ok(message=f"Drive '{drive.job_title}' closed.")


    @app.route('/api/admin/applications', methods=['GET'])
    @admin_required
    def admin_get_applications():
        search = request.args.get('search', '').strip()
        status = request.args.get('status', '').strip()

        query = Application.query.join(Student).join(PlacementDrive).join(Company)
        if search:
            query = query.filter(or_(
                Student.stu_name.ilike(f'%{search}%'),
                Student.roll_no.ilike(f'%{search}%'),
                PlacementDrive.job_title.ilike(f'%{search}%'),
                Company.company_name.ilike(f'%{search}%')
            ))
        if status:
            query = query.filter(Application.status == status)

        apps = query.order_by(Application.applied_at.desc()).all()
        return ok([a.to_dict() for a in apps])


    @app.route('/api/admin/stats', methods=['GET'])
    @admin_required
    def admin_stats():
        total_students = Student.query.count()
        total_companies = Company.query.count()
        total_drives = PlacementDrive.query.count()
        total_apps = Application.query.count()
        total_selected = Application.query.filter_by(status=AppStatus.Selected_app).count()
        total_rejected = Application.query.filter_by(status=AppStatus.Rejected_app).count()
        total_shortlisted = Application.query.filter_by(status=AppStatus.Shortlisted_app).count()
        total_interview   = Application.query.filter_by(status=AppStatus.Interview_app).count()

        placement_rate = round((total_selected / total_apps * 100), 1) if total_apps else 0

        drives_pending  = PlacementDrive.query.filter_by(status=DriveStatus.Pending_status).count()
        drives_approved = PlacementDrive.query.filter_by(status=DriveStatus.Approved_status).count()
        drives_rejected = PlacementDrive.query.filter_by(status=DriveStatus.Rejected_status).count()
        drives_closed   = PlacementDrive.query.filter_by(status=DriveStatus.Closed_status).count()

        companies = Company.query.filter_by(approval_status=CompanyStatus.Approved_status).all()
        company_data = []
        for co in companies:
            total = sum(len(d.applications) for d in co.drives)
            selected = sum(
                1 for d in co.drives 
                for a in d.applications 
                if a.status == AppStatus.Selected_app
            )

            if co.drives:
                company_data.append({
                    'name': co.company_name, 
                    'drives': len(co.drives),
                    'apps': total, 
                    'selected': selected
                })


        company_data.sort(key=lambda x: x['apps'], reverse=True)

        students  = Student.query.all()
        dept_stats = {}
        for stu in students:
            dept = stu.department or 'Other'
            if dept not in dept_stats:
                dept_stats[dept] = {'total': 0, 'selected': 0}
            dept_stats[dept]['total'] += 1

            selected_count = sum(1 for a in stu.applications if a.status == AppStatus.Selected_app)
            if selected_count:
                dept_stats[dept]['selected'] += 1

            # if any(a.status == AppStatus.Selected_app for a in stu.applications):
            #     dept_stats[dept]['selected'] += 1


        dept_list = [
            {'department': k, 
             'total': v['total'], 
             'selected': v['selected']
            }
            for k, v in dept_stats.items()
            if v['total'] > 0
        ]
        dept_list.sort(key=lambda x: x['selected'], reverse=True)

        return ok({
            'overview': {
                'total_students': total_students,
                'total_companies': total_companies,
                'total_drives': total_drives,
                'total_apps': total_apps,
                'total_selected': total_selected,
                'total_rejected': total_rejected,
                'total_shortlisted': total_shortlisted,
                'total_interview': total_interview,
                'placement_rate': placement_rate
            },
            'drives_by_status': {
                'pending': drives_pending,
                'approved': drives_approved,
                'rejected': drives_rejected,
                'closed': drives_closed
            },
            'top_companies': company_data[:10],
            'dept_stats': dept_list
        })


    @app.route('/api/admin/lookups', methods=['GET'])
    @admin_required
    def admin_lookups():
        return ok({
            'departments': DEPARTMENTS,
            'degrees': DEGREES,
            'industries': INDUSTRIES,
            'job_types': JOB_TYPES
        })
    









    @app.route('/api/company/dashboard', methods=['GET'])
    @company_required
    def company_dashboard():
        user_id = int(get_jwt_identity())
        co = Company.query.filter_by(user_id=user_id).first()
        if not co:
            return err('Company profile not found.', 404)

        drives = PlacementDrive.query.filter_by(company_id=co.id)\
                                      .order_by(PlacementDrive.created_at.desc()).all()
        total_apps = sum(len(d.applications) for d in drives)
        active_drives = sum(1 for d in drives if d.status == DriveStatus.Approved_status)
        pending_drives = sum(1 for d in drives if d.status == DriveStatus.Pending_status)
        total_selected = Application.query.join(PlacementDrive)\
                                         .filter(PlacementDrive.company_id == co.id,
                                                 Application.status == AppStatus.Selected_app).count()

        return ok({
            'company': co.to_dict(),
            'stats': {
                'total_drives': len(drives),
                'active_drives': active_drives,
                'pending_drives': pending_drives,
                'total_apps': total_apps,
                'total_selected': total_selected
            },
            'drives': [d.to_dict() for d in drives]
        })


    @app.route('/api/company/profile', methods=['GET'])
    @company_required
    def company_get_profile():
        user_id = int(get_jwt_identity())
        co = Company.query.filter_by(user_id=user_id).first()
        if not co:
            return err('Company profile not found.', 404)
        return ok(co.to_dict())


    @app.route('/api/company/profile', methods=['PUT'])
    @company_required
    def company_update_profile():
        user_id = int(get_jwt_identity())
        co = Company.query.filter_by(user_id=user_id).first()
        if not co:
            return err('Company profile not found.', 404)
        
        body = request.get_json() or {}

        co.industry = body.get('industry', co.industry)
        co.hr_name = body.get('hr_name', co.hr_name)
        co.hr_contact = body.get('hr_contact', co.hr_contact)
        co.website = body.get('website', co.website)
        co.description = body.get('description', co.description)
        co.location = body.get('location', co.location)
        db.session.commit()
        return ok(co.to_dict(), 'Profile updated seccessfullly.')


    @app.route('/api/company/drives', methods=['POST'])
    @company_required
    def company_create_drive():
        from datetime import datetime, date
        user_id = int(get_jwt_identity())
        co = Company.query.filter_by(user_id=user_id).first()

        if not co or not co.is_approved():
            return err('Your company must be approved before posting drives.')

        body = request.get_json() or {}
        job_title = body.get('job_title', '').strip()
        desc = body.get('job_description', '').strip()
        deadline_str = body.get('application_deadline', '').strip()

        if not job_title:
            return err('Job title is required.')
        if not desc:
            return err('Job description is required.')
        if not deadline_str:
            return err('Application deadline is required.')

        try:
            deadline = datetime.strptime(deadline_str, '%Y-%m-%d').date()
            if deadline < date.today():
                return err('Deadline cannot be in the past.')
        except ValueError:
            return err('Invalid date format. Use YYYY-MM-DD.')

        drive = PlacementDrive(
            company_id = co.id,
            job_title = job_title,
            job_description = desc,
            job_type = body.get('job_type', '').strip() or None,
            eligible_branches = body.get('eligible_branches', '').strip() or None,
            eligible_degrees = body.get('eligible_degrees', '').strip() or None,
            min_cgpa = safe_float(body.get('min_cgpa'), 0.0, 10.0) or 0.0,
            required_skills = body.get('required_skills', '').strip() or None,
            salary_range = body.get('salary_range', '').strip() or None,
            location = body.get('location', '').strip() or None,
            application_deadline = deadline,
            status = DriveStatus.Pending_status
        )
        db.session.add(drive)
        db.session.commit()

        # cache.delete('admin_dashboard')
        _invalidate_dashboard_cache()

        return ok(drive.to_dict(), 'Drive submitted for admin approval.', 201)


    @app.route('/api/company/drives/<int:drive_id>', methods=['PUT'])
    @company_required
    def company_edit_drive(drive_id):
        from datetime import datetime
        user_id = int(get_jwt_identity())
        co = Company.query.filter_by(user_id=user_id).first()
        drive = PlacementDrive.query.filter_by(id=drive_id, company_id=co.id).first_or_404()

        if drive.status not in (DriveStatus.Pending_status, DriveStatus.Rejected_status):
            return err('Only pending or rejected drives can be edited.')

        body = request.get_json() or {}
        deadline_str = body.get('application_deadline', '').strip()

        if deadline_str:
            try:
                #drive.application_deadline = datetime.strptime(deadline_str, '%Y-%m-%d').date()
                new_deadline = datetime.strptime(deadline_str, '%Y-%m-%d').date()
                if new_deadline < date.today():
                    return err('Deadline cannot be in the past.')
                drive.application_deadline = new_deadline

            except ValueError:
                return err('Invalid date format. please use YYYY-MM-DD.')

        drive.job_title = body.get('job_title', drive.job_title).strip()
        drive.job_description = body.get('job_description', drive.job_description)
        drive.job_type = body.get('job_type', drive.job_type)
        drive.eligible_branches = body.get('eligible_branches', drive.eligible_branches)
        drive.eligible_degrees = body.get('eligible_degrees',  drive.eligible_degrees)
        drive.min_cgpa = safe_float(body.get('min_cgpa'), 0.0, 10.0) or drive.min_cgpa
        drive.required_skills = body.get('required_skills', drive.required_skills)
        drive.salary_range = body.get('salary_range', drive.salary_range)
        drive.location  = body.get('location', drive.location)
        drive.status = DriveStatus.Pending_status
        db.session.commit()
        
        # cache.delete('open_drives')
        _invalidate_drives_cache()
        return ok(drive.to_dict(), 'Drive updated and re-submitted for approval.')


    @app.route('/api/company/drives/<int:drive_id>/close', methods=['POST'])
    @company_required
    def company_close_drive(drive_id):
        user_id = int(get_jwt_identity())
        co  = Company.query.filter_by(user_id=user_id).first()
        drive = PlacementDrive.query.filter_by(id=drive_id, company_id=co.id).first_or_404()
        drive.status = DriveStatus.Closed_status
        db.session.commit()

        # cache.delete('open_drives')
        _invalidate_drives_cache()

        return ok(message=f"'{drive.job_title}' has been closed.")


    @app.route('/api/company/drives/<int:drive_id>', methods=['DELETE'])
    @company_required
    def company_delete_drive(drive_id):
        user_id = int(get_jwt_identity())
        co = Company.query.filter_by(user_id=user_id).first()
        drive = PlacementDrive.query.filter_by(id=drive_id, company_id=co.id).first_or_404()

        if drive.status == DriveStatus.Approved_status:
            return err('Approved drives cannot be deleted. Close it first.')

        title = drive.job_title
        db.session.delete(drive)
        db.session.commit()
        return ok(message=f"'{title}' deleted.")


    @app.route('/api/company/drives/<int:drive_id>/applications', methods=['GET'])
    @company_required
    def company_drive_applications(drive_id):
        user_id = int(get_jwt_identity())
        co = Company.query.filter_by(user_id=user_id).first()
        drive = PlacementDrive.query.filter_by(id=drive_id, company_id=co.id).first_or_404()
        status = request.args.get('status', '').strip()

        query = Application.query.filter_by(drive_id=drive_id)
        if status:
            query = query.filter(Application.status == status)

        apps = query.order_by(Application.applied_at.desc()).all()
        return ok({
            'drive': drive.to_dict(),
            'applications': [a.to_dict() for a in apps],
            'app_statuses': AppStatus.ALL
        })


    @app.route('/api/company/applications/<int:app_id>', methods=['PUT'])
    @company_required
    def company_update_application(app_id):
        from datetime import datetime
        user_id = int(get_jwt_identity())
        co = Company.query.filter_by(user_id=user_id).first()
        app_obj = Application.query.get_or_404(app_id)

        if app_obj.drive.company_id != co.id:
            return err('Access denied.', 403)

        body = request.get_json() or {}
        status = body.get('status', app_obj.status)

        if status not in AppStatus.ALL:
            return err(f"Invalid status. Pleasee choose it from ;- {', '.join(AppStatus.ALL)}..")

        app_obj.status = status
        app_obj.notes = body.get('notes', app_obj.notes)

        interview_date_str = (body.get('interview_date') or '').strip()
        if interview_date_str:
            try:
                app_obj.interview_date = datetime.strptime(interview_date_str, '%Y-%m-%dT%H:%M')
            except ValueError:
                return err('Invalid interview date. Use YYYY-MM-DDTHH:MM.')

        app_obj.interview_mode = body.get('interview_mode', app_obj.interview_mode)
        app_obj.interview_location = body.get('interview_location', app_obj.interview_location)

        db.session.commit()
        return ok(app_obj.to_dict(), 'Application updated.')


    @app.route('/api/company/lookups', methods=['GET'])
    @company_required
    def company_lookups():
        return ok({
            'job_types': JOB_TYPES,
            'departments': DEPARTMENTS,
            'degrees': DEGREES,
            'industries': INDUSTRIES,
            'app_statuses': AppStatus.ALL
        })








    @app.route('/api/student/dashboard', methods=['GET'])
    @student_required
    def student_dashboard():
        user_id = int(get_jwt_identity())
        student = Student.query.filter_by(user_id=user_id).first()
        if not student:
            return err('Student profile not found.', 404)

        today = date.today()

        # IDs of drives already applied to
        applied_ids = {a.drive_id for a in student.applications}

        # Open drives not yet applied to
        open_drives_query = PlacementDrive.query.filter(
            PlacementDrive.status == DriveStatus.Approved_status,
            PlacementDrive.application_deadline >= today
        )
        if applied_ids:
            open_drives_query = open_drives_query.filter(
                PlacementDrive.id.notin_(applied_ids)
            )
        available_drives = open_drives_query.order_by(
            PlacementDrive.application_deadline.asc()
        ).all()

        recent_apps = (Application.query.filter_by(student_id=student.id)
                       .order_by(Application.applied_at.desc()).limit(5).all())

        return ok({
            'student': student.to_dict(),
            'stats': {
                'total_apps': Application.query.filter_by(student_id=student.id).count(),
                'applied_count': Application.query.filter_by(student_id=student.id, status=AppStatus.Applied_app).count(),
                'shortlisted': Application.query.filter_by(student_id=student.id, status=AppStatus.Shortlisted_app).count(),
                'interviews': Application.query.filter_by(student_id=student.id, status=AppStatus.Interview_app).count(),
                'selected': Application.query.filter_by(student_id=student.id, status=AppStatus.Selected_app).count(),
                'available_drives': len(available_drives)
            },
            'available_drives': [d.to_dict() for d in available_drives[:5]],
            'recent_apps': [a.to_dict() for a in recent_apps],
            'applied_ids': list(applied_ids)
        })


    @app.route('/api/student/drives', methods=['GET'])
    @student_required
    @cache.cached(timeout=60, key_prefix='open_drives')
    def student_browse_drives():
        today = date.today()
        search = request.args.get('search', '').strip()

        eligible_only = request.args.get('eligible_only', '').strip()

        # Only use cache when no filters are applied
        if not search and not eligible_only:
            cached = cache.get('open_drives')
            if cached:
                return ok(cached)

        query = PlacementDrive.query.join(Company).filter(
            PlacementDrive.status == DriveStatus.Approved_status,
            PlacementDrive.application_deadline >= today
        )
        if search:
            query = query.filter(or_(
                PlacementDrive.job_title.ilike(f'%{search}%'),
                Company.company_name.ilike(f'%{search}%'),
                PlacementDrive.required_skills.ilike(f'%{search}%'),
                PlacementDrive.location.ilike(f'%{search}%')
            ))

        drives = query.order_by(PlacementDrive.application_deadline.asc()).all()
        
        # Optional eligibility filter (optional from here to )
        if eligible_only == 'true':
            user_id = int(get_jwt_identity())
            student = Student.query.filter_by(user_id=user_id).first()
            if student:
                drives = [d for d in drives if d.student_is_eligible(student)[0]]

        result = [d.to_dict() for d in drives]

        # Cache only the unfiltered full list
        if not search and not eligible_only:
            cache.set('open_drives', result, timeout=60)  #(--here)
        
        return ok([d.to_dict() for d in drives])
    
    @app.route('/api/student/drives/<int:drive_id>/apply', methods=['POST'])
    @student_required
    def student_apply(drive_id):
        user_id = int(get_jwt_identity())
        student = Student.query.filter_by(user_id=user_id).first()
        drive = PlacementDrive.query.get_or_404(drive_id)

        if not drive.is_open():
            return err('Sorry, you missed.. This drive is no longer accepting applications.')

        existing = Application.query.filter_by(
            student_id=student.id, drive_id=drive_id
        ).first()
        if existing:
            return err('You have already applied to this drive.')

        eligible, reason = drive.student_is_eligible(student)
        if not eligible:
            return err(f'Opps.. You are not eligible for this drive. {reason}')

        try:
            application = Application(student_id=student.id, drive_id=drive_id)
            db.session.add(application)
            db.session.commit()
            _invalidate_dashboard_cache()
            return ok(application.to_dict(),
                      f'Successfully applied to {drive.job_title} at {drive.company.company_name}!',
                      201)
        except IntegrityError:
            db.session.rollback()
            return err('You have already applied to this drive.')


    @app.route('/api/student/profile', methods=['GET'])
    @student_required
    def student_get_profile():
        user_id = int(get_jwt_identity())
        student = Student.query.filter_by(user_id=user_id).first()
        if not student:
            return err('ohhh.. Student profile not found.', 404)
        return ok(student.to_dict())


    @app.route('/api/student/profile', methods=['PUT'])
    @student_required
    def student_update_profile():
        user_id = int(get_jwt_identity())
        student = Student.query.filter_by(user_id=user_id).first()
        body = request.get_json() or {}

        student.stu_name = body.get('stu_name', student.stu_name).strip()
        student.phone  = body.get('phone', student.phone)
        student.department = body.get('department', student.department)
        student.degree = body.get('degree', student.degree)
        student.grad_year = safe_int(body.get('graduation_year')) or student.grad_year
        student.cgpa  = safe_float(body.get('cgpa')) or student.cgpa
        student.skills = body.get('skills', student.skills)
        student.bio = body.get('bio', student.bio)
        db.session.commit()
        return ok(student.to_dict(), 'Profile updated.')


    @app.route('/api/student/profile/resume', methods=['POST'])
    @student_required
    def student_upload_resume():
        from werkzeug.utils import secure_filename
        user_id = int(get_jwt_identity())
        student = Student.query.filter_by(user_id=user_id).first()

        if 'resume' not in request.files:
            return err('No file provided.')
        
        file = request.files['resume']
        if not file or not file.filename:
            return err('No file selected.')
        if not allowed_file(file.filename):
            return err('Only PDF files are allowed.')

        filename = secure_filename(
            student.email.replace('@', '_').replace('.', '_') + '_resume.pdf'
        )
        file.save(os.path.join(Config.UPLOAD_FOLDER, filename))
        student.resume_filename = filename
        db.session.commit()
        return ok({'resume_filename': filename}, 'Resume uploaded sucesssfully.')
    
    @app.route('/api/student/applications', methods=['GET'])
    @student_required
    def student_get_applications():
        user_id = int(get_jwt_identity())
        student = Student.query.filter_by(user_id=user_id).first()
        status = request.args.get('status', '').strip()

        query = Application.query.filter_by(student_id=student.id)
        if status:
            query = query.filter(Application.status == status)

        apps = query.order_by(Application.applied_at.desc()).all()
        return ok({
            'applications': [a.to_dict() for a in apps],
            'app_statuses': AppStatus.ALL
        })


    @app.route('/api/student/history', methods=['GET'])
    @student_required
    def student_history():
        user_id = int(get_jwt_identity())
        student = Student.query.filter_by(user_id=user_id).first()

        history = Application.query.filter(
            Application.student_id == student.id,
            Application.status.in_([AppStatus.Selected_app, AppStatus.Rejected_app])
        ).order_by(Application.updated_at.desc()).all()

        return ok([a.to_dict() for a in history])
    

    # @app.route('/api/student/export', methods=["POST"])
    # @student_required
    # def student_trigger_export():
    #     user_id = int(get_jwt_identity())
    #     student = Student.query.filter_by(user_id=user_id).first()

    #     job = ExportJob(student_id=student.id)
    #     db.session.add(job)
    #     db.session.commit()

        
    #     from tasks import export_csv_task
    #     task = export_csv_task.delay(job.id)

    #     job.celery_task_id = task.id
    #     db.session.commit()

    #     return ok({'job_id': job.id},
    #             "Export startedd..! You will recieve an email when its ready..."
    #             , 202)
        
    @app.route('/api/student/export', methods=['POST'])
    @student_required
    def student_trigger_export():
        import csv, io as _io

        user_id = int(get_jwt_identity())
        student = Student.query.filter_by(user_id=user_id).first()

        # Create the export job record
        job = ExportJob(student_id=student.id)
        db.session.add(job)
        db.session.commit()

        # Try Celery first
        try:
            from tasks import export_csv_task
            task = export_csv_task.delay(job.id)

            job.celery_task_id = task.id
            db.session.commit()

            return ok({'job_id': job.id, 'mode': 'async'},
                    'Export started! Check back in a few seconds or watch your email.', 202)

        # Fallback (YOUR ADDITION)
        except Exception as celery_err:
            print(f"Celery unavailable ({celery_err}). Generating CSV synchronously.")

            try:
                apps = Application.query.filter_by(student_id=student.id)\
                    .order_by(Application.applied_at.desc()).all()

                output = _io.StringIO()
                writer = csv.writer(output)

                writer.writerow([
                    'Application ID','Student ID','Student Name','Roll No',
                    'Company Name','Drive Title','Job Type','Salary Range',
                    'Application Status','Applied On','Last Updated',
                    'Interview Date','Interview Mode','Notes'
                ])

                for app in apps:
                    writer.writerow([
                        app.id, student.id, student.stu_name, student.roll_no or '',
                        app.drive.company.company_name, app.drive.job_title,
                        app.drive.job_type or '', app.drive.salary_range or '',
                        app.status,
                        app.applied_at.strftime('%Y-%m-%d %H:%M'),
                        app.updated_at.strftime('%Y-%m-%d %H:%M'),
                        app.interview_date.strftime('%Y-%m-%d %H:%M') if app.interview_date else '',
                        app.interview_mode or '', app.notes or ''
                    ])

                csv_data = output.getvalue()

                # Save file
                os.makedirs(Config.EXPORT_FOLDER, exist_ok=True)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"{student.roll_no or student.id}_applications_{timestamp}.csv"
                filepath = os.path.join(Config.EXPORT_FOLDER, filename)

                with open(filepath, 'w', newline='', encoding='utf-8') as f:
                    f.write(csv_data)

                # Update job
                job.status = ExportStatus.Done
                job.filename = filename
                job.file_path = filepath
                job.completed_at = datetime.utcnow()
                db.session.commit()

                return ok({
                    'job_id': job.id,
                    'mode': 'sync',
                    'filename': filename,
                    'download_url': f'/api/exports/{filename}',
                    'total_rows': len(apps),
                    'csv_data': csv_data
                }, f'Export ready! {len(apps)} application(s) exported.', 200)

            except Exception as sync_err:
                job.status = ExportStatus.Failed
                db.session.commit()
                return err(f'Export failed: {str(sync_err)}', 500)




    @app.route('/api/student/export/<int:job_id>', methods=["GET"])
    @student_required
    def student_export_status(job_id):
        user_id = int(get_jwt_identity())
        student = Student.query.filter_by(user_id=user_id).first()

        job = ExportJob.query.filter_by(id=job_id, student_id=student.id).first_or_404()

        return ok(job.to_dict())


app = create_app()


