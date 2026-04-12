
"""
demo_celery.py ;; Live Celery + Email Demo 

Shows all 3 Celery background jobs working in real time.

Requirements:
  1. python run.py          (Flask must be running)
  2. celery -A celery_run worker --loglevel=info --pool=solo  (Worker must be running)
  3. mailhog                (Email catcher must be running)

Run:
  python demo_celery.py

Then open http://localhost:8025 to see emails arrive in MailHog.
"""

import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

GREEN  = '\033[92m'
RED    = '\033[91m'
YELLOW = '\033[93m'
CYAN   = '\033[96m'
BOLD   = '\033[1m'
RESET  = '\033[0m'

def banner(msg):
    print(f"\n{BOLD}{YELLOW}{'═'*25}{RESET}")
    print(f"{BOLD}{YELLOW}  {msg}{RESET}")
    print(f"{BOLD}{YELLOW}{'═'*30}{RESET}\n")

def step(n, msg):
    print(f"{BOLD}{CYAN}  [{n}] {msg}{RESET}")

def ok(msg):
    print(f"{GREEN}  ✅ {msg}{RESET}")

def info(msg):
    print(f"  ℹ  {msg}")

def warn(msg):
    print(f"{YELLOW}  ⚠  {msg}{RESET}")


def demo_job1_deadline_reminders(app):
    """
    JOB 1: Daily Deadline Reminders
    Sends email to students whose applied drives close in 1 or 3 days.
    """
    banner("JOB 1 - Daily Deadline Reminders")
    info("This job normally runs every 24 hours via Celery Beat.")
    info("We are triggering it manually to demonstrate.")

    from tasks import send_deadline_reminders
    from models import PlacementDrive, Application
    from datetime import date, timedelta

    with app.app_context():
        # Show what drives are close to deadline
        today = date.today()
        day_1 = today + timedelta(days=1)
        day_3 = today + timedelta(days=3)

        upcoming = PlacementDrive.query.filter(
            PlacementDrive.application_deadline.in_([day_1, day_3])
        ).all()

        if upcoming:
            info(f"Found {len(upcoming)} drives closing in 1 or 3 days:")
            for d in upcoming:
                days_left = (d.application_deadline - today).days
                applied_count = len(d.applications)
                info(f"    '{d.job_title}' at {d.company.company_name} - {days_left} day(s) left, {applied_count} applied")
        else:
            warn("No drives closing in exactly 1 or 3 days today.")
            warn("The task will run but send 0 emails (no matching drives).")
            warn("To demo with real emails: create a drive with deadline = tomorrow.")

    step("→", "Triggering Job 1 via Celery...")
    result = send_deadline_reminders.apply_async()

    info("Task submitted. Waiting for result...")
    try:
        output = result.get(timeout=30)
        ok(f"Job 1 completed! Reminded: {output.get('reminded', 0)} students")
        ok("Check http://localhost:8025 for reminder emails!")
    except Exception as e:
        warn(f"Job 1 error: {e}")
        warn("Is the Celery worker running?")


def demo_job2_monthly_report(app):
    """
    JOB 2: Monthly Activity Report
    Emails the admin a full HTML report with last month's placement stats.
    """
    banner("JOB 2 - Monthly Activity Report")
    info("This job normally runs on the 1st of every month via Celery Beat.")
    info("We are triggering it manually to demonstrate.")
    info("It will email a full HTML report to the admin email.")

    from tasks import send_monthly_report

    step("→", "Triggering Job 2 via Celery...")
    result = send_monthly_report.apply_async()

    info("Task submitted. Waiting for result...")
    try:
        output = result.get(timeout=30)
        status = output.get('status', '?')
        if status == 'sent':
            ok(f"Job 2 completed! Report sent for: {output.get('month', '?')}")
            ok("Check http://localhost:8025 for the monthly report email!")
        else:
            warn(f"Job 2 status: {status}. Error: {output.get('error','?')}")
    except Exception as e:
        warn(f"Job 2 error: {e}")
        warn("Is the Celery worker running?")


def demo_job3_csv_export(app):
    """
    JOB 3: CSV Export (User-Triggered)
    Creates a CSV of a student's full application history and emails them.
    """
    banner("JOB 3 - Async CSV Export")
    info("This job is triggered when a student clicks 'Export as CSV' in their profile.")
    info("The UI polls every 3 seconds to check status (pending → processing → done).")

    from tasks import export_csv_task
    from models import Student, ExportJob
    from extensions import db

    with app.app_context():
        # Find a student with applications to export
        students_with_apps = Student.query.all()
        student = next((s for s in students_with_apps if len(s.applications) > 0), None)

        if not student:
            warn("No students with applications found. Run seed_test_data.py first.")
            return

        info(f"Creating export job for: {student.stu_name} ({len(student.applications)} applications)")

        # Create export job record (same as what the API does)
        job = ExportJob(student_id=student.id)
        db.session.add(job)
        db.session.commit()
        job_id = job.id

        info(f"Export job created: ID={job_id}, status=pending")

    step("→", "Triggering Job 3 via Celery...")
    result = export_csv_task.apply_async(args=[job_id])

    info("Task submitted. Polling status every 2 seconds...")
    for i in range(15):
        time.sleep(2)
        with app.app_context():
            from models import ExportJob
            job = ExportJob.query.get(job_id)
            status = job.status if job else 'unknown'
            print(f"  Poll {i+1}: status = {BOLD}{status}{RESET}")
            if status == 'done':
                ok(f"Job 3 DONE! File: {job.filename}")
                ok(f"Download: http://localhost:5000/api/exports/{job.filename}")
                ok("Check http://localhost:8025 for the 'Export Ready' email!")
                break
            elif status == 'failed':
                warn("Job 3 FAILED. Check Celery worker logs.")
                break
    else:
        warn("Job 3 still processing after 30 seconds. Check Celery worker.")


def demo_caching(app):
    """
    Shows Redis caching working - admin dashboard is cached for 120 seconds.
    """
    banner("BONUS - Redis Caching Demo")
    info("Admin dashboard is cached in Redis for 120 seconds.")
    info("First request hits the database. Second request hits Redis cache.")

    import time
    import requests

    # We need a valid admin token
    try:
        r = requests.post('http://localhost:5000/api/auth/login', json={
            'email': 'siddharth@placeiitm.ac.in',
            'password': 'Siddharth@300',
            'role': 'admin'
        }, timeout=5)
        if not r.json().get('success'):
            warn("Admin login failed. Is Flask running?")
            return
        token = r.json()['data']['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        step("→", "First call - hits database, stores in Redis")
        t0 = time.time()
        r1 = requests.get('http://localhost:5000/api/admin/dashboard', headers=headers, timeout=10)
        t1 = time.time() - t0
        ok(f"First call: {t1*1000:.0f}ms (DB query + Redis write)")

        step("→", "Second call - reads from Redis cache")
        t0 = time.time()
        r2 = requests.get('http://localhost:5000/api/admin/dashboard', headers=headers, timeout=10)
        t2 = time.time() - t0
        ok(f"Second call: {t2*1000:.0f}ms (Redis read, no DB)")

        if t2 < t1:
            ok(f"Cache speedup: {t1*1000:.0f}ms → {t2*1000:.0f}ms ({((t1-t2)/t1*100):.0f}% faster)")
        else:
            info(f"Both calls fast (Redis + SQLite are both very fast locally)")

    except Exception as e:
        warn(f"Could not connect to Flask: {e}")
        warn("Make sure python run.py is running first.")


def main():
    banner("PlaceIITM V2 - Live Celery + Redis Demo")
    print(f"{CYAN}This script demonstrates all 3 Celery jobs and Redis caching.{RESET}")
    print(f"{CYAN}Make sure these are running:{RESET}")
    print("  1. redis-server")
    print("  2. mailhog  →  inbox at http://localhost:8025")
    print("  3. python run.py  →  app at http://localhost:5000")
    print("  4. celery -A celery_run worker --loglevel=info --pool=solo")
    print()

    try:
        from app import app
    except Exception as e:
        print(f"{RED}Cannot import app: {e}{RESET}")
        print("Run this script from the project root directory.")
        sys.exit(1)

    print(f"\n{BOLD}Which demo do you want to run?{RESET}")
    print("  1 - Job 1: Daily Deadline Reminders")
    print("  2 - Job 2: Monthly Activity Report")
    print("  3 - Job 3: Async CSV Export")
    print("  4 - Redis Caching Demo")
    print("  all - Run ALL demos in sequence")
    print()
    choice = input("Enter choice [1/2/3/4/all]: ").strip().lower()

    if choice == '1' or choice == 'all':
        demo_job1_deadline_reminders(app)
        if choice == 'all': time.sleep(2)

    if choice == '2' or choice == 'all':
        demo_job2_monthly_report(app)
        if choice == 'all': time.sleep(2)

    if choice == '3' or choice == 'all':
        demo_job3_csv_export(app)
        if choice == 'all': time.sleep(2)

    if choice == '4' or choice == 'all':
        demo_caching(app)

    banner("Demo Complete!")
    print(f"{GREEN}Open http://localhost:8025 to see all emails in MailHog.{RESET}")
    print(f"{GREEN}Open http://localhost:5000 to demo the full UI.{RESET}")
    print()


if __name__ == '__main__':
    main()
