
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
        #os.makedirs(os.path.join(app.root_path, 'instance'), exist_ok=True)
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
        admin.set_password('Siddharth@300')
        db.session.add(admin)
        db.session.commit()
        print(f"\n Admin seeded successfully {admin.email}/ Siddharth@300 \n")
    else:
        print("\n Admin account already exists. Skipping seeding. \n")


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

def safe_float(value, min_val=0.0, max_val=10.0):
    try:
        v = float(value)
        return v if min_val <= v <= max_val else None
    except:
        return None
    
def safe_int(value):
    try:
        return int(value)
    except:
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
    def serve_vue(path):
        if path.startswith('api/') or path.startswith('static/'):
            from flask import abort
            abort(404)
        return render_template('index.html')






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
            return err("You account is deactivated sir")

        if user.is_blacklisted:
            return err("Sorry, Your account has been blacklisted. Please contact to placement cell.")
        
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
        }, f'Welcome back sir, {user.username}!!')

    @app.route('/api/auth/refresh', methods=['POST'])
    @jwt_required(refresh=True)
    def refresh():      
        return ok({"access_token": create_access_token(identity=get_jwt_identity())}, "Token refreshed successfully")
            

    @app.route('/api/auth/me', methods=['GET'])
    @jwt_required()
    def me():
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return err("User not found", 404)
        
        return ok(user.to_dict())
    



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
            return err('Password must be at least 6 characters long.')
        
        if User.query.filter_by(email=email).first():
            return err('Email already registered.')
        
        if User.query.filter_by(username=username).first():
            return err('Username already taken.')
        
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
            grad_year=body.get('gradudation_year', '').strip() or None,
            cgpa=safe_float(body.get('cgpa', '').strip() or None),
            skills=body.get('skills', '').strip() or None
        )
        db.session.add(student)
        db.session.commit()

        return ok(message= "Dear Student, Hurrayy your registration successful", status=201)


    @app.route('/api/auth/register/company', methods=['POST'])
    def register_company():
        body = request.get_json() or {}

        username = body.get('username', '').strip()
        email = body.get('email', '').strip().lower()
        passwd = body.get('password', '')
        company_name = body.get('company_name', '').strip()

        if not all([username, email, passwd, company_name]):
            return err('ohh-hoo, Username, email, password and company name are required.')
        
        if len(passwd) < 6:
            return err('Password must be at least 6 characters long.')
        
        if User.query.filter_by(email=email).first():
            return err('Email already registered.')
        
        if User.query.filter_by(username=username).first():
            return err('This Username already taken sir.')
        
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

    @app.route('/api/student/lookups', methods=['GET'])
    def student_lookups():
        return ok({'departments': DEPARTMENTS, 'degrees': DEGREES, 'app_statuses': AppStatus.ALL})


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
        }, "Admin dashboard data fetched successfully"), 200

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


        companies = Company.query.order_by(Company.registered_at.desc()).all()

        return ok([co.to_dict() for co in companies], "Companies fetched successfully")
    

    
    @app.route('/api/admin/companies/<int:co_id>/approve', methods=['POST'])
    @admin_required
    def admin_approve_company(co_id):

        co = Company.query.get_or_404(co_id)
        co.approval_status = CompanyStatus.Approved_status
        db.session.commit()

        return ok(message=f"'{co.company_name}' hass been approved..")
    
    
    @app.route('/api/admin/companies/<int:co_id>/reject', methods=["POST"])
    @admin_required
    def admin_reject_company(co_id):
        co = Company.query.get_or_404(co_id)
        co.approval_status = CompanyStatus.Rejected_status
        db.session.commit()
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
        return ok(message=f"'{name}' deleted..")
    
    @app.route('/api/admin/companies/<int:co_id>', methods=['PUT'])
    @admin_required
    def admin_edit_company(co_id):
        co = Company.query.get_or_404(co_id)
        body = request.get_json() or {}

        co.company_name = body.get('company_name', co.company_name).strip()
        co.industry = body.get('industry', co.industry)
        co.hr_name = body.get('hr_name', co.hr_name)
        co.hr_contact = body.get('hr_contact', co.hr_contact)
        co.website = body.get('description', co.description)
        co.location = body.get('location', co.location)
        db.session.commit()
        return ok(co.to_dict(), f"'{co.company_name}' updated..")
    

    @app.route("/api/admin/students", methods=['GET'])
    @admin_required
    def admin_get_students():
        search = request.args.get('search', '').strip()
        dept = request.args.get('department', '').strip()
        grad_yr = request.args.get('graduation_year', '').strip()

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
        
        if grad_yr:
            query = query.filter(Student.grad_year == safe_int(grad_yr))

        students = query.order_by(Student.grad_year == safe_int(grad_yr))

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
        stu.grad_yr = safe_int(body.get('graduation_year')) or stu.graduation_year
        stu.cgpa = safe_float(body.get('cgpa')) or stu.cgpa
        stu.skills = body.get('skills', stu.skills)
        stu.roll_no  = body.get('roll_no', stu.roll_no)
        db.session.commit()
        return ok(stu.to_dict(), f"'{stu.stu_name}' updated.")


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
        return ok(message=f"'{name}' deleted.")


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
        return ok(message=f"Drive '{drive.job_title}' approved.")


    @app.route('/api/admin/drives/<int:drive_id>/reject', methods=['POST'])
    @admin_required
    def admin_reject_drive(drive_id):
        drive = PlacementDrive.query.get_or_404(drive_id)
        drive.status = DriveStatus.Rejected_status
        db.session.commit()
        return ok(message=f"Drive '{drive.job_title}' rejected.")


    @app.route('/api/admin/drives/<int:drive_id>/close', methods=['POST'])
    @admin_required
    def admin_close_drive(drive_id):
        drive = PlacementDrive.query.get_or_404(drive_id)
        drive.status = DriveStatus.CLOSED
        db.session.commit()
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

        placement_rate = round((total_selected / total_apps * 100), 1) if total_apps else 0

        drives_pending  = PlacementDrive.query.filter_by(status=DriveStatus.Pending_status).count()
        drives_approved = PlacementDrive.query.filter_by(status=DriveStatus.Approved_status).count()
        drives_rejected = PlacementDrive.query.filter_by(status=DriveStatus.Rejected_status).count()
        drives_closed   = PlacementDrive.query.filter_by(status=DriveStatus.Closed_status).count()

        companies = Company.query.filter_by(approval_status=CompanyStatus.Approved_status).all()
        company_data = []
        for co in companies:
            total    = sum(len(d.applications) for d in co.drives)
            selected = sum(1 for d in co.drives for a in d.applications if a.status == AppStatus.Selected_app)
            if co.drives:
                company_data.append({'name': co.company_name, 'drives': len(co.drives),
                                     'apps': total, 'selected': selected})
        company_data.sort(key=lambda x: x['apps'], reverse=True)

        students  = Student.query.all()
        dept_stats = {}
        for stu in students:
            dept = stu.department or 'Other'
            if dept not in dept_stats:
                dept_stats[dept] = {'total': 0, 'selected': 0}
            dept_stats[dept]['total'] += 1
            if any(a.status == AppStatus.Selected_app for a in stu.applications):
                dept_stats[dept]['selected'] += 1

        dept_list = [
            {'department': k, 'total': v['total'], 'selected': v['selected']}
            for k, v in dept_stats.items() if v['total'] > 0
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



    @app.route('/api/student/dashboard', methods=['GET'])
    def student_dashboard():
        return jsonify({"message": "Student dashboard accessed successfully"}), 200

app = create_app()


