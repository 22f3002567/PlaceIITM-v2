import os
import csv
from datetime import datetime, date, timedelta

from flask_mail import Message

from extensions import celery, db, mail
from models import (
    Student, PlacementDrive, Application, ExportJob,
    AppStatus, DriveStatus, ExportStatus
)

# JOB 1:- Daily Deadline Reminders

@celery.task(name='tasks.send_deadline_reminders', bind=True)
def send_deadline_reminders(self):

    today = date.today()
    day_1 = today + timedelta(days=1)
    day_3 = today + timedelta(days=3)

    # Drives closing tomorrow or in 3 days
    upcoming = PlacementDrive.query.filter(
        PlacementDrive.status == DriveStatus.Approved_status,
        PlacementDrive.application_deadline.in_([day_1, day_3])
    ).all()

    if not upcoming:
        print("There is know No upcoming deadlines to remind about today.")
        return {'reminded': 0}

    students = Student.query.join(Student.user).filter_by(is_active=True).all()
    reminded = 0

    for drive in upcoming:
        days_left = (drive.application_deadline - today).days
        applied_student_ids = {a.student_id for a in drive.applications}

        for student in students:
            if student.id in applied_student_ids:
                continue   # Already applied -> skip (no reminder needed)

            try:
                msg = Message(
                    subject=f"⏰ Reminder: {drive.job_title} at {drive.company.company_name} closes in {days_left} day(s)!",
                    recipients=[student.email],
                    html=_reminder_email_html(student, drive, days_left)
                )
                mail.send(msg)
                reminded += 1
            except Exception as e:
                print(f"Failed to send reminder to {student.email}: {e}")

    print(f"Daily reminders sent: {reminded}")
    return {'reminded': reminded}


def _reminder_email_html(student, drive, days_left):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="background:#1a56db; padding:20px; text-align:center;">
            <h1 style="color:white; margin:0;">PlaceIITM</h1>
            <p style="color:#bfdbfe; margin:4px 0 0;">Campus Placement Portal</p>
        </div>
        <div style="padding:28px; background:#f9fafb;">
            <p>Hi <strong>{student.stu_name}</strong>,</p>
            <p>This is a reminder that the placement drive below is closing soon!</p>

            <div style="background:white; border-left:4px solid #ef4444; padding:16px; border-radius:4px; margin:20px 0;">
                <h2 style="margin:0 0 8px; color:#111;">{drive.job_title}</h2>
                <p style="margin:0; color:#6b7280;">🏢 {drive.company.company_name}</p>
                <p style="margin:4px 0; color:#6b7280;">📍 {drive.location or 'Location not specified'}</p>
                <p style="margin:4px 0; color:#6b7280;">💰 {drive.salary_range or 'Salary not disclosed'}</p>
                <p style="margin:12px 0 0; font-weight:bold; color:#ef4444;">
                    ⏰ Deadline: {drive.application_deadline.strftime('%d %B %Y')} ({days_left} day(s) left)
                </p>
            </div>

            <p>Log in to PlaceIITM and apply before the deadline.</p>
            <a href="http://localhost:5000/student/drives"
               style="display:inline-block; background:#1a56db; color:white;
                      padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">
                Apply Now ->
            </a>

            <p style="margin-top:28px; color:#9ca3af; font-size:12px;">
                PlaceIITM · Campus Placement Portal · IITM BS Program · Siddharth  <br>
                You are receiving this because you are a registered student.
            </p>
        </div>
    </div>
    """

# JOB 2 ;- Monthly Activity Report to Admin

@celery.task(name='tasks.send_monthly_report', bind=True)
def send_monthly_report(self):
    from flask import current_app
    admin_email = current_app.config.get('ADMIN_EMAIL', 'admin@placeiitm.ac.in')

    today = date.today()
    # First day of current month -> first day of last month
    first_this_month = today.replace(day=1)
    first_last_month = (first_this_month - timedelta(days=1)).replace(day=1)
    last_month_name = first_last_month.strftime('%B %Y')

    # Stats for last month
    drives_this_month = PlacementDrive.query.filter(
        PlacementDrive.created_at >= datetime.combine(first_last_month, datetime.min.time()),
        PlacementDrive.created_at < datetime.combine(first_this_month, datetime.min.time())
    ).all()

    apps_this_month = Application.query.filter(
        Application.applied_at >= datetime.combine(first_last_month, datetime.min.time()),
        Application.applied_at < datetime.combine(first_this_month, datetime.min.time())
    ).all()

    selected = [a for a in apps_this_month if a.status == AppStatus.Selected_app]
    rejected = [a for a in apps_this_month if a.status == AppStatus.Rejected_app]

    # Company-wise breakdown
    company_stats = {}
    for app in apps_this_month:
        co_name = app.drive.company.company_name
        if co_name not in company_stats:
            company_stats[co_name] = {'applied': 0, 'selected': 0}
        company_stats[co_name]['applied'] += 1
        if app.status == AppStatus.Selected_app:
            company_stats[co_name]['selected'] += 1

    html = _monthly_report_html(
        month_name = last_month_name,
        total_drives = len(drives_this_month),
        total_apps = len(apps_this_month),
        total_selected = len(selected),
        total_rejected = len(rejected),
        company_stats = company_stats,
        drives = drives_this_month
    )

    try:
        msg = Message(
            subject=f"📊 PlaceIITM Monthly Report ;- {last_month_name}",
            recipients=[admin_email],
            html=html
        )
        mail.send(msg)
        print(f"Monthly report sent to {admin_email} for {last_month_name}.")
        return {'status': 'sent', 'month': last_month_name}
    except Exception as e:
        print(f"Failed to send monthly report: {e}")
        return {'status': 'failed', 'error': str(e)}


def _monthly_report_html(month_name, total_drives, total_apps,
                         total_selected, total_rejected, company_stats, drives):
    company_rows = ''
    for co_name, stats in company_stats.items():
        rate = round((stats['selected'] / stats['applied']) * 100) if stats['applied'] else 0
        company_rows += f"""
        <tr>
            <td style="padding:10px; border-bottom:1px solid #e5e7eb;">{co_name}</td>
            <td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:center;">{stats['applied']}</td>
            <td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:center;">{stats['selected']}</td>
            <td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:center;">{rate}%</td>
        </tr>"""

    drive_rows = ''
    for d in drives:
        drive_rows += f"""
        <tr>
            <td style="padding:10px; border-bottom:1px solid #e5e7eb;">{d.job_title}</td>
            <td style="padding:10px; border-bottom:1px solid #e5e7eb;">{d.company.company_name}</td>
            <td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:center;">{d.status}</td>
            <td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:center;">{len(d.applications)}</td>
        </tr>"""

    return f"""
    <div style="font-family:Arial,sans-serif; max-width:700px; margin:auto; background:#f9fafb;">
        <div style="background:#1a56db; padding:24px; text-align:center;">
            <h1 style="color:white; margin:0;">PlaceIITM</h1>
            <h2 style="color:#bfdbfe; margin:8px 0 0; font-weight:400;">Monthly Activity Report</h2>
            <p style="color:#93c5fd; margin:4px 0 0;">{month_name}</p>
        </div>

        <div style="padding:28px;">
            <h3 style="color:#374151;">Summary</h3>
            <div style="display:flex; gap:12px; margin-bottom:24px;">
                {''.join([f"""
                <div style="flex:1; background:white; border-radius:8px; padding:16px; text-align:center; border:1px solid #e5e7eb;">
                    <div style="font-size:32px; font-weight:bold; color:{color};">{value}</div>
                    <div style="color:#6b7280; font-size:14px;">{label}</div>
                </div>""" for value, label, color in [
                    (total_drives, 'Drives Posted', "#2462e7"),
                    (total_apps, 'Applications',  "#05A572"),
                    (total_selected, 'Selected',  "#8a4ef1"),
                    (total_rejected, 'Rejected',  "#e32c2c"),
                ]])}
            </div>

            <h3 style="color:#374151; margin-top:28px;">Company-wise Breakdown</h3>
            <table style="width:100%; border-collapse:collapse; background:white; border-radius:8px; overflow:hidden;">
                <thead>
                    <tr style="background:#f3f4f6;">
                        <th style="padding:12px; text-align:left; color:#374151;">Company</th>
                        <th style="padding:12px; text-align:center; color:#374151;">Applied</th>
                        <th style="padding:12px; text-align:center; color:#374151;">Selected</th>
                        <th style="padding:12px; text-align:center; color:#374151;">Selection Rate</th>
                    </tr>
                </thead>
                <tbody>{company_rows if company_rows else '<tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;">No company activity this month.</td></tr>'}</tbody>
            </table>

            <h3 style="color:#374151; margin-top:28px;">Drives Conducted</h3>
            <table style="width:100%; border-collapse:collapse; background:white; border-radius:8px; overflow:hidden;">
                <thead>
                    <tr style="background:#f3f4f6;">
                        <th style="padding:12px; text-align:left; color:#374151;">Role</th>
                        <th style="padding:12px; text-align:left; color:#374151;">Company</th>
                        <th style="padding:12px; text-align:center; color:#374151;">Status</th>
                        <th style="padding:12px; text-align:center; color:#374151;">Applicants</th>
                    </tr>
                </thead>
                <tbody>{drive_rows if drive_rows else '<tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;">No drives this month.</td></tr>'}</tbody>
            </table>

            <p style="margin-top:32px; color:#9ca3af; font-size:12px; text-align:center;">
                Auto-generated by PlaceIITM · {datetime.now().strftime('%d %B %Y, %I:%M %p')}
            </p>
        </div>
    </div>
    """

# JOB 3 :- User-Triggered CSV Export

@celery.task(name='tasks.export_csv_task', bind=True)
def export_csv_task(self, job_id):

    from flask import current_app

    job = ExportJob.query.get(job_id)
    if not job:
        return {'error': 'Export job not found.'}

    job.status = ExportStatus.Processing_status
    db.session.commit()

    try:
        student = job.student
        export_dir = current_app.config['EXPORT_FOLDER']
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{student.roll_no or student.id}_applications_{timestamp}.csv"
        filepath = os.path.join(export_dir, filename)

        applications = Application.query.filter_by(student_id=student.id)\
                                        .order_by(Application.applied_at.desc()).all()

        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow([
                'Application ID',
                'Student ID', 
                'Student Name', 
                'Roll No',
                'Company Name', 
                'Drive Title', 
                'Job Type', 
                'Salary Range',
                'Application Status', 
                'Applied On', 
                'Last Updated',
                'Interview Date', 
                'Interview Mode', 
                'Notes'
            ])
            for app in applications:
                writer.writerow([
                    app.id,
                    student.id,
                    student.stu_name,
                    student.roll_no or '',
                    app.drive.company.company_name,
                    app.drive.job_title,
                    app.drive.job_type or '',
                    app.drive.salary_range or '',
                    app.status,
                    app.applied_at.strftime('%Y-%m-%d %H:%M'),
                    app.updated_at.strftime('%Y-%m-%d %H:%M'),
                    app.interview_date.strftime('%Y-%m-%d %H:%M') if app.interview_date else '',
                    app.interview_mode or '',
                    app.notes or ''
                ])

        # Update job record
        job.status = ExportStatus.Done
        job.file_path = filepath
        job.filename = filename
        job.completed_at = datetime.utcnow()
        db.session.commit()

        # Sending email with download info
        download_url = f"http://localhost:5000/api/exports/{filename}"
        try:
            msg = Message(
                subject='✅ Your PlaceIITM Application History Export is Ready!',
                recipients=[student.email],
                html=_export_ready_html(student, filename, len(applications), download_url)
            )
            mail.send(msg)
        except Exception as e:
            print(f"Export email failed for {student.email}: {e}")

        return {'status': 'done', 'filename': filename, 'rows': len(applications)}

    except Exception as e:
        job.status = ExportStatus.Failed
        db.session.commit()
        print(f"Export job {job_id} failed: {e}")
        return {'status': 'failed', 'error': str(e)}


def _export_ready_html(student, filename, total_rows, download_url):
    return f"""
    <div style="font-family:Arial,sans-serif; max-width:600px; margin:auto;">
        <div style="background:#059669; padding:20px; text-align:center;">
            <h1 style="color:white; margin:0;">✅ Export Ready!</h1>
        </div>
        <div style="padding:28px; background:#f9fafb;">
            <p>Hi <strong>{student.stu_name}</strong>,</p>
            <p>Your placement application history export is ready!</p>

            <div style="background:white; border:1px solid #d1fae5; border-radius:8px; padding:16px; margin:20px 0;">
                <p style="margin:0; color:#374151;"><strong>📄 File:</strong> {filename}</p>
                <p style="margin:8px 0 0; color:#374151;"><strong>📊 Total records:</strong> {total_rows} applications</p>
            </div>

            <p>Log in to PlaceIITM and go to your dashboard to download the file:</p>
            <a href="{download_url}"
               style="display:inline-block; background:#059669; color:white;
                      padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">
                Download CSV →
            </a>

            <p style="margin-top:28px; color:#9ca3af; font-size:12px;">
                PlaceIITM · Campus Placement Portal
            </p>
        </div>
    </div>
    """