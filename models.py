from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class Role:
    Admin_role = 'admin'
    Company_role = 'company'
    Student_role = 'student'
    ALL = [Admin_role, Company_role, Student_role]

class CompanyStatus:
    Pending_status = 'pending'
    Approved_status = 'approved'
    Rejected_status = 'rejected'
    Closed_status = 'closed'

class DriveStatus:
    Pending_status = 'pending'
    Approved_status = 'approved'
    Rejected_status = 'rejected'
    Closed_status = 'closed'

class AppStatus:
    Applied_app     = 'Applied'
    Shortlisted_app = 'Shortlisted'
    Interview_app   = 'Interview'
    Selected_app    = 'Selected'
    Rejected_app    = 'Rejected'
    ALL         = [Applied_app, Shortlisted_app, Interview_app, Selected_app, Rejected_app]

class ExportStatus:
    Pending_status    = 'pending'
    Processing_status = 'processing'
    Done       = 'done'
    Failed    = 'failed'


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    email = db.Column(db.String(191), unique=True, nullable=False, index=True)
    passwd = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(30), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_blacklisted = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


    company_profile = db.relationship('Company', backref='user', uselist=False, cascade='all, delete-orphan')
    student_profile = db.relationship('Student', backref='user', uselist=False, cascade='all, delete-orphan')

    def set_password(self, raw_password):
        self.passwd = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.passwd, raw_password)

    def is_admin(self):
        return self.role == Role.Admin_role
    
    def is_company(self):
        return self.role == Role.Company_role
    
    def is_student(self):
        return self.role == Role.Student_role

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'is_blacklisted': self.is_blacklisted,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<User {self.username} [{self.role}]>'


class Company(db.Model):
    __tablename__ = 'companies'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    company_name = db.Column(db.String(200), nullable=False)
    industry = db.Column(db.String(100))
    hr_name = db.Column(db.String(100))
    hr_contact = db.Column(db.String(100))
    website = db.Column(db.String(200))
    description = db.Column(db.Text)
    location = db.Column(db.String(150))
    approval_status = db.Column(db.String(30), default=CompanyStatus.PENDING, nullable=False)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    drives = db.relationship('PlacementDrive', backref='company', lazy=True, cascade='all, delete-orphan')

    def is_approved(self):
        return self.approval_status == CompanyStatus.Approved_status

    def to_dict(self, include_drives=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'company_name': self.company_name,
            'industry': self.industry or '',
            'hr_name': self.hr_name or '',
            'hr_contact': self.hr_contact or '',
            'website': self.website or '',
            'description': self.description or '',
            'location': self.location or '',
            'approval_status': self.approval_status,
            'email': self.user.email,
            'username': self.user.username,
            'is_active': self.user.is_active,
            'is_blacklisted': self.user.is_blacklisted,
            'registered_at': self.registered_at.isoformat(),
            'total_drives':  len(self.drives),
            'total_applicants': sum(len(d.applications) for d in self.drives)
        }
        if include_drives:
            data['drives'] = [d.to_dict() for d in self.drives]
        return data

    def __repr__(self):
        return f'<Company {self.company_name} [{self.approval_status}]>'


class Student(db.Model):
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True)
    user_id  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    stu_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(191), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20))
    roll_no = db.Column(db.String(50), unique=True)
    department = db.Column(db.String(100))
    degree  = db.Column(db.String(60))
    grad_year = db.Column(db.Integer)
    cgpa = db.Column(db.Float)
    skills = db.Column(db.Text)  
    bio = db.Column(db.Text)
    resume_filename = db.Column(db.String(200))
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    applications = db.relationship('Application', backref='student', lazy=True, cascade='all, delete-orphan')
    export_jobs  = db.relationship('ExportJob', backref='student', lazy=True, cascade='all, delete-orphan')

    @property
    def profile_completeness(self):
        checks = [
            (self.stu_name,15),
            (self.phone,10),
            (self.roll_no, 10),
            (self.department, 10),
            (self.degree, 10),
            (self.grad_year, 5),
            (self.cgpa, 10),
            (self.skills, 15),
            (self.bio, 5),
            (self.resume_filename, 10),
        ]
        return sum(pts for val, pts in checks if val)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'stu_name': self.stu_name,
            'email': self.email,
            'phone': self.phone,
            'roll_no': self.roll_no,
            'department': self.department,
            'degree': self.degree,
            'grad_year': self.grad_year,
            'cgpa': self.cgpa,
            'skills': self.skills,
            'bio': self.bio,
            'resume_filename': self.resume_filename,
            'profile_completeness': self.profile_completeness,
            'is_active': self.user.is_active,
            'is_blacklisted': self.user.is_blacklisted,
            'username': self.user.username,
            'registered_at': self.registered_at.isoformat(),
            'total_applications': len(self.applications)
        }

    def __repr__(self):
        return f'<Student {self.full_name} [{self.roll_no}]>'


class PlacementDrive(db.Model):
    __tablename__ = 'placement_drives'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    job_title = db.Column(db.String(200), nullable=False)
    job_description = db.Column(db.Text)
    job_type = db.Column(db.String(50))
    eligible_branches = db.Column(db.Text)      
    eligible_degrees = db.Column(db.Text)     
    min_cgpa  = db.Column(db.Float, default=0.0)
    required_skills = db.Column(db.Text)    
    salary_range  = db.Column(db.String(100))
    location = db.Column(db.String(150))
    application_deadline = db.Column(db.Date, nullable=False) 
    status = db.Column(db.String(30), default=DriveStatus.PENDING, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    applications = db.relationship('Application', backref='drive', lazy=True, cascade='all, delete-orphan')

    def is_open(self):
        return (
            self.status == DriveStatus.Approved_status and
            self.application_deadline is not None and
            self.application_deadline >= date.today()
        )

    def days_left(self):
        if not self.application_deadline:
            return None
        delta = self.application_deadline - date.today()
        return max(0, delta.days)

    def student_is_eligible(self, student):
        if self.min_cgpa and student.cgpa and student.cgpa < self.min_cgpa:
            return False, f"Minimum CGPA required is {self.min_cgpa}. Yours is {student.cgpa}."

        if self.eligible_branches and student.department:
            branches = [b.strip() for b in self.eligible_branches.split(',')]
            if branches and student.department not in branches:
                return False, f"This drive is open to: {self.eligible_branches}."

        if self.eligible_degrees and student.degree:
            degrees = [d.strip() for d in self.eligible_degrees.split(',')]
            if degrees and student.degree not in degrees:
                return False, f"This drive is open to: {self.eligible_degrees} students."

        return True, "Eligible"

    def to_dict(self, include_applications=False):
        data = {
            'id': self.id,
            'company_id': self.company_id,
            'company_name': self.company.company_name,
            'company_location': self.company.location,
            'job_title': self.job_title,
            'job_description': self.job_description,
            'job_type': self.job_type,
            'eligible_branches': self.eligible_branches,
            'eligible_degrees': self.eligible_degrees,
            'min_cgpa': self.min_cgpa,
            'required_skills': self.required_skills,
            'salary_range': self.salary_range,
            'location': self.location,
            'application_deadline': self.application_deadline.isoformat()
                                    if self.application_deadline else None,
            'status': self.status,
            'is_open': self.is_open(),
            'days_left': self.days_left(),
            'total_applications': len(self.applications),
            'created_at': self.created_at.isoformat()
        }
        if include_applications:
            data['applications'] = [a.to_dict() for a in self.applications]
        return data

    def __repr__(self):
        return f'<Drive {self.job_title} @ {self.company.company_name} [{self.status}]>'




class Application(db.Model):
    __tablename__ = 'applications'

    id  = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    drive_id = db.Column(db.Integer, db.ForeignKey('placement_drives.id'), nullable=False)
    status  = db.Column(db.String(30), default=AppStatus.APPLIED, nullable=False)
    applied_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes   = db.Column(db.Text)  

    # Interview scheduling fields
    interview_date = db.Column(db.DateTime, nullable=True)
    interview_mode = db.Column(db.String(50), nullable=True)   # Online / Offline
    interview_location = db.Column(db.String(200), nullable=True)

    # Unique -> one student, one drive, one application. DB-level enforcement.
    __table_args__ = (
        db.UniqueConstraint('student_id', 'drive_id', name='uix_student_drive'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.full_name,
            'student_email': self.student.email,
            'roll_no':  self.student.roll_no,
            'cgpa':  self.student.cgpa,
            'department':  self.student.department,
            'degree': self.student.degree,
            'skills': self.student.skills,
            'resume_filename': self.student.resume_filename,
            'drive_id': self.drive_id,
            'job_title': self.drive.job_title,
            'job_type': self.drive.job_type,
            'salary_range': self.drive.salary_range,
            'company_name': self.drive.company.company_name,
            'company_id': self.drive.company_id,
            'status': self.status,
            'notes': self.notes,
            'interview_date': self.interview_date.isoformat() if self.interview_date else None,
            'interview_mode':  self.interview_mode,
            'interview_location': self.interview_location,
            'applied_at': self.applied_at.isoformat(),
            'updated_at':  self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<Application Student:{self.student_id} → Drive:{self.drive_id} [{self.status}]>'


class ExportJob(db.Model):
    __tablename__ = 'export_jobs'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    celery_task_id = db.Column(db.String(200))          # Celery task ID for internal tracking
    status  = db.Column(db.String(30), default=ExportStatus.PENDING)
    file_path = db.Column(db.String(300))            # Absolute path to the CSV
    filename = db.Column(db.String(200))            # Just the filename for download URL
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id':self.id,
            'status':self.status,
            'filename': self.filename,
            'requested_at': self.requested_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

    def __repr__(self):
        return f'<ExportJob Student:{self.student_id} [{self.status}]>'
