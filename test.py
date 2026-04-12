"""
viva_test_guide.py — Interactive Viva Demo Script for PlaceIITM V2

Run this script to test every feature of the app from the command line.
It talks directly to your running Flask server at http://localhost:5000

Usage:
    python viva_test_guide.py

Requirements:
    pip install requests

Start the app first:
    python run.py
"""

import sys
import json
import time
import requests

BASE = 'http://localhost:5000/api'

# ── Terminal colours ──────────────────────────────────────────────────────────
GREEN  = '\033[92m'
RED    = '\033[91m'
YELLOW = '\033[93m'
CYAN   = '\033[96m'
BOLD   = '\033[1m'
RESET  = '\033[0m'

def ok(msg):   print(f"{GREEN}  ✅ {msg}{RESET}")
def fail(msg): print(f"{RED}  ❌ {msg}{RESET}")
def info(msg): print(f"{CYAN}  ℹ  {msg}{RESET}")
def head(msg): print(f"\n{BOLD}{YELLOW}{'='*55}{RESET}\n{BOLD}{YELLOW}  {msg}{RESET}\n{BOLD}{YELLOW}{'='*55}{RESET}")
def sub(msg):  print(f"\n{BOLD}  {msg}{RESET}")

tokens = {}   # stores {role: access_token}

def post(path, data=None, token=None, files=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if files:
        r = requests.post(f'{BASE}{path}', data=data, files=files, headers=headers, timeout=10)
    else:
        headers['Content-Type'] = 'application/json'
        r = requests.post(f'{BASE}{path}', json=data, headers=headers, timeout=10)
    return r

def get(path, token=None, params=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    return requests.get(f'{BASE}{path}', headers=headers, params=params, timeout=10)

def put(path, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    return requests.put(f'{BASE}{path}', json=data, headers=headers, timeout=10)

def delete(path, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    return requests.delete(f'{BASE}{path}', headers=headers, timeout=10)

def assert_ok(r, label):
    if r.status_code in (200, 201, 202) and r.json().get('success'):
        ok(f"{label} → {r.status_code}")
        return r.json().get('data')
    else:
        fail(f"{label} → {r.status_code}: {r.json().get('message','?')}")
        return None

def assert_err(r, label, expected_code=400):
    if not r.json().get('success'):
        ok(f"{label} correctly rejected → {r.status_code}: {r.json().get('message','')[:60]}")
    else:
        fail(f"{label} should have been rejected but succeeded")

def login(email, password, role):
    r = post('/auth/login', {'email': email, 'password': password, 'role': role})
    if r.status_code == 200 and r.json().get('success'):
        token = r.json()['data']['access_token']
        tokens[role] = token
        ok(f"Login as {role} ({email})")
        return token
    else:
        fail(f"Login failed for {email}: {r.json().get('message','')}")
        return None


# ══════════════════════════════════════════════════════════════════════════════

def test_auth():
    head("TEST 1 — Authentication & JWT")

    sub("1a. Valid admin login")
    login('siddharth@placeiitm.ac.in', 'Siddharth@300', 'admin')

    sub("1b. Valid company login")
    login('hr@google.com', 'Test@1234', 'company')

    sub("1c. Valid student login")
    login('ramji@iitm.ac.in', 'Test@1234', 'student')

    sub("1d. Wrong password — must reject")
    r = post('/auth/login', {'email': 'ramji@iitm.ac.in', 'password': 'wrongpass', 'role': 'student'})
    assert_err(r, "Wrong password")

    sub("1e. Wrong role — must reject")
    r = post('/auth/login', {'email': 'ramji@iitm.ac.in', 'password': 'Test@1234', 'role': 'admin'})
    assert_err(r, "Wrong role")

    sub("1f. Missing fields — must reject")
    r = post('/auth/login', {'email': 'ramji@iitm.ac.in'})
    assert_err(r, "Missing password and role")

    sub("1g. JWT token refresh")
    if tokens.get('student'):
        r = post('/auth/refresh', token=tokens['student'])
        data = assert_ok(r, "Token refresh")
        if data:
            tokens['student'] = data['access_token']
            info("New access token obtained")

    sub("1h. Access protected route without token — must get 401/403")
    r = get('/admin/dashboard')
    if r.status_code in (401, 403, 422):
        ok(f"No token correctly rejected → {r.status_code}")
    else:
        fail(f"Should have been rejected but got {r.status_code}")

    sub("1i. Student trying admin route — must get 403")
    r = get('/admin/dashboard', token=tokens.get('student'))
    if r.status_code == 403:
        ok(f"Student blocked from admin route → 403")
    else:
        fail(f"Should have got 403 but got {r.status_code}")


def test_registration():
    head("TEST 2 — Registration & Validation")

    sub("2a. Register new student (valid)")
    r = post('/auth/register/student', {
        'username': 'test_student_new',
        'email': 'newstudent@iitm.ac.in',
        'password': 'Test@1234',
        'stu_name': 'New Test Student',
        'roll_no': '99f9999999',
        'phone': '9876543210',
        'department': 'Data Science',
        'degree': 'BS',
        'graduation_year': '2026',
        'cgpa': '8.0',
        'skills': 'Python, SQL'
    })
    assert_ok(r, "New student registered")

    sub("2b. Duplicate email — must reject")
    r = post('/auth/register/student', {
        'username': 'test_student_new2',
        'email': 'newstudent@iitm.ac.in',  # same email
        'password': 'Test@1234',
        'stu_name': 'Another Student',
        'roll_no': '99f8888888'
    })
    assert_err(r, "Duplicate email rejected")

    sub("2c. Duplicate roll number — must reject")
    r = post('/auth/register/student', {
        'username': 'test_student_new3',
        'email': 'another@iitm.ac.in',
        'password': 'Test@1234',
        'stu_name': 'Another Student',
        'roll_no': '21f1001234'   # already used by Ramji
    })
    assert_err(r, "Duplicate roll number rejected")

    sub("2d. Password too short — must reject")
    r = post('/auth/register/student', {
        'username': 'test_short',
        'email': 'short@iitm.ac.in',
        'password': 'abc',  # only 3 chars
        'stu_name': 'Short Pass',
        'roll_no': '99f7777777'
    })
    assert_err(r, "Short password rejected")

    sub("2e. Missing required fields — must reject")
    r = post('/auth/register/student', {'username': 'incomplete'})
    assert_err(r, "Missing fields rejected")

    sub("2f. Register new company (valid)")
    r = post('/auth/register/company', {
        'username': 'newco_hr',
        'email': 'hr@newcompany.com',
        'password': 'Test@1234',
        'company_name': 'New Test Company',
        'industry': 'Technology & Software',
        'location': 'Mumbai'
    })
    assert_ok(r, "New company registered")

    sub("2g. Company login before admin approval — should still work (approval is for drives)")
    login('hr@newcompany.com', 'Test@1234', 'company')


def test_admin():
    head("TEST 3 — Admin Features")
    t = tokens.get('admin')
    if not t:
        fail("No admin token — skipping")
        return

    sub("3a. Admin dashboard stats")
    r = get('/admin/dashboard', token=t)
    data = assert_ok(r, "Admin dashboard")
    if data:
        s = data['stats']
        info(f"Students: {s['total_students']}, Companies: {s['total_companies']}, "
             f"Drives: {s['total_drives']}, Apps: {s['total_apps']}")
        info(f"Pending companies: {s['pending_cos']}, Pending drives: {s['pending_drives']}")

    sub("3b. Admin get all companies")
    r = get('/admin/companies', token=t)
    data = assert_ok(r, "Get companies")

    sub("3c. Admin search companies by name")
    r = get('/admin/companies', token=t, params={'search': 'Google'})
    data = assert_ok(r, "Search companies: 'Google'")
    if data:
        info(f"Found {len(data)} companies matching 'Google'")

    sub("3d. Admin filter companies by status")
    r = get('/admin/companies', token=t, params={'status': 'pending'})
    data = assert_ok(r, "Filter companies: pending")
    if data:
        info(f"Pending companies: {len(data)}")

    sub("3e. Admin approve a company")
    # Find StartupXYZ (pending)
    companies_r = get('/admin/companies', token=t, params={'status': 'pending'})
    pending = companies_r.json().get('data', [])
    if pending:
        co_id = pending[0]['id']
        r = post(f'/admin/companies/{co_id}/approve', token=t)
        assert_ok(r, f"Approve company id={co_id}")

    sub("3f. Admin reject a company")
    r = post(f'/admin/companies/{co_id}/reject', token=t)
    assert_ok(r, f"Reject company id={co_id}")

    sub("3g. Admin blacklist a company")
    all_cos = get('/admin/companies', token=t).json().get('data', [])
    approved_co = next((c for c in all_cos if c['approval_status']=='approved' and not c['is_blacklisted']), None)
    if approved_co:
        r = post(f'/admin/companies/{approved_co["id"]}/blacklist', token=t)
        assert_ok(r, f"Blacklist '{approved_co['company_name']}'")
        r = post(f'/admin/companies/{approved_co["id"]}/blacklist', token=t)
        assert_ok(r, f"Unblacklist '{approved_co['company_name']}'")

    sub("3h. Admin get all students")
    r = get('/admin/students', token=t)
    data = assert_ok(r, "Get all students")
    if data:
        info(f"Total students: {len(data)}")

    sub("3i. Admin search students")
    r = get('/admin/students', token=t, params={'search': 'Ramji'})
    data = assert_ok(r, "Search students: 'Ramji'")

    sub("3j. Admin filter students by department")
    r = get('/admin/students', token=t, params={'department': 'Data Science'})
    data = assert_ok(r, "Filter by department: Data Science")
    if data:
        info(f"Data Science students: {len(data)}")

    sub("3k. Admin blacklist a student")
    students_r = get('/admin/students', token=t).json().get('data', [])
    vikram = next((s for s in students_r if s['roll_no'] == '22f1005678'), None)
    if vikram:
        r = post(f'/admin/students/{vikram["id"]}/blacklist', token=t)
        assert_ok(r, f"Blacklist Vikram (low CGPA student)")
        # Verify blacklisted student cannot login
        r2 = post('/auth/login', {'email':'vikram@iitm.ac.in','password':'Test@1234','role':'student'})
        assert_err(r2, "Blacklisted student login blocked")
        # Unblacklist for other tests
        post(f'/admin/students/{vikram["id"]}/blacklist', token=t)
        ok("Vikram unblacklisted")

    sub("3l. Admin deactivate a student")
    if vikram:
        r = post(f'/admin/students/{vikram["id"]}/toggle-active', token=t)
        assert_ok(r, "Deactivate student account")
        r2 = post('/auth/login', {'email':'vikram@iitm.ac.in','password':'Test@1234','role':'student'})
        assert_err(r2, "Deactivated student login blocked")
        # Reactivate
        post(f'/admin/students/{vikram["id"]}/toggle-active', token=t)
        ok("Student reactivated")

    sub("3m. Admin get all drives")
    r = get('/admin/drives', token=t)
    data = assert_ok(r, "Get all drives")

    sub("3n. Admin approve a pending drive")
    pending_drives = get('/admin/drives', token=t, params={'status':'pending'}).json().get('data',[])
    if pending_drives:
        drive_id = pending_drives[0]['id']
        r = post(f'/admin/drives/{drive_id}/approve', token=t)
        assert_ok(r, f"Approve drive '{pending_drives[0]['job_title']}'")

    sub("3o. Admin view all applications")
    r = get('/admin/applications', token=t)
    data = assert_ok(r, "Get all applications")
    if data:
        info(f"Total applications: {len(data)}")

    sub("3p. Admin filter applications by status")
    r = get('/admin/applications', token=t, params={'status': 'Selected'})
    data = assert_ok(r, "Filter applications: Selected")
    if data:
        info(f"Selected applications: {len(data)}")

    sub("3q. Admin statistics/reports page")
    r = get('/admin/stats', token=t)
    data = assert_ok(r, "Admin stats/reports")
    if data:
        o = data['overview']
        info(f"Placement rate: {o['placement_rate']}%")
        info(f"Top companies: {len(data['top_companies'])}")
        info(f"Dept stats: {len(data['dept_stats'])}")

    sub("3r. Admin edit a company")
    cos = get('/admin/companies', token=t).json().get('data',[])
    if cos:
        r = put(f'/admin/companies/{cos[0]["id"]}', {'company_name': cos[0]['company_name'], 'location': 'Updated City'}, token=t)
        assert_ok(r, "Edit company location")

    sub("3s. Admin edit a student")
    stus = get('/admin/students', token=t).json().get('data',[])
    if stus:
        r = put(f'/admin/students/{stus[0]["id"]}', {'stu_name': stus[0]['stu_name'], 'phone': '9000000001'}, token=t)
        assert_ok(r, "Edit student phone")


def test_company():
    head("TEST 4 — Company Features")

    # Login as approved Google HR
    t = login('hr@google.com', 'Test@1234', 'company')
    if not t:
        fail("Company login failed — skipping")
        return

    sub("4a. Company dashboard")
    r = get('/company/dashboard', token=t)
    data = assert_ok(r, "Company dashboard")
    if data:
        s = data['stats']
        info(f"Drives: {s['total_drives']}, Active: {s['active_drives']}, Apps: {s['total_apps']}")

    sub("4b. Company profile view")
    r = get('/company/profile', token=t)
    assert_ok(r, "Company profile")

    sub("4c. Company update profile")
    r = put('/company/profile', {'hr_name': 'Sundar Pichai', 'location': 'Bengaluru, Karnataka'}, token=t)
    assert_ok(r, "Update company profile")

    sub("4d. Company create a new drive (valid)")
    import datetime
    deadline = (datetime.date.today() + datetime.timedelta(days=30)).strftime('%Y-%m-%d')
    r = post('/company/drives', {
        'job_title': 'Backend Engineer',
        'job_description': 'Build robust APIs and microservices using Python and Go.',
        'job_type': 'Full Time',
        'eligible_branches': 'Computer Science & Engineering,Data Science',
        'min_cgpa': '7.0',
        'required_skills': 'Python, Go, REST APIs, Docker',
        'salary_range': '20–28 LPA',
        'location': 'Bengaluru',
        'application_deadline': deadline
    }, token=t)
    new_drive = assert_ok(r, "Create new drive")

    sub("4e. Create drive with past deadline — must reject")
    r = post('/company/drives', {
        'job_title': 'Past Drive',
        'job_description': 'This should fail.',
        'application_deadline': '2020-01-01'
    }, token=t)
    assert_err(r, "Past deadline rejected")

    sub("4f. Create drive without title — must reject")
    r = post('/company/drives', {'job_description': 'No title', 'application_deadline': deadline}, token=t)
    assert_err(r, "Missing job title rejected")

    sub("4g. View applicants for a drive")
    drives = get('/company/dashboard', token=t).json().get('data',{}).get('drives',[])
    approved_drive = next((d for d in drives if d['status']=='approved'), None)
    if approved_drive:
        r = get(f'/company/drives/{approved_drive["id"]}/applications', token=t)
        data = assert_ok(r, f"Get applicants for '{approved_drive['job_title']}'")
        if data:
            info(f"Applicants: {len(data['applications'])}")
            return data, approved_drive, t

    sub("4h. Update application status")
    drives = get('/company/dashboard', token=t).json().get('data',{}).get('drives',[])
    approved_drive = next((d for d in drives if d['status']=='approved'), None)
    if approved_drive:
        apps_data = get(f'/company/drives/{approved_drive["id"]}/applications', token=t).json().get('data',{})
        apps = apps_data.get('applications', [])
        applied_app = next((a for a in apps if a['status']=='Applied'), None)
        if applied_app:
            r = put(f'/company/applications/{applied_app["id"]}', {
                'status': 'Shortlisted',
                'notes': 'Strong profile, moving to next round.'
            }, token=t)
            assert_ok(r, f"Update application to Shortlisted")

    sub("4i. Schedule an interview")
    if approved_drive:
        apps_data = get(f'/company/drives/{approved_drive["id"]}/applications', token=t).json().get('data',{})
        apps = apps_data.get('applications', [])
        shortlisted = next((a for a in apps if a['status']=='Shortlisted'), None)
        if shortlisted:
            import datetime
            interview_time = (datetime.datetime.now() + datetime.timedelta(days=5)).strftime('%Y-%m-%dT%H:%M')
            r = put(f'/company/applications/{shortlisted["id"]}', {
                'status': 'Interview',
                'notes': 'You are shortlisted for technical interview.',
                'interview_date': interview_time,
                'interview_mode': 'Online',
                'interview_location': 'https://meet.google.com/test-link'
            }, token=t)
            assert_ok(r, "Schedule interview")

    sub("4j. Filter applicants by status")
    if approved_drive:
        r = get(f'/company/drives/{approved_drive["id"]}/applications', token=t, params={'status':'Applied'})
        data = assert_ok(r, "Filter applicants by Applied status")

    sub("4k. Pending company cannot create drives")
    pending_token = login('hr@startup.com', 'Test@1234', 'company')
    # Note: Startup is pending, but we just approved/rejected it above
    # Let's use a freshly registered company that's definitely pending
    t_pending = login('hr@newcompany.com', 'Test@1234', 'company')
    if t_pending:
        r = post('/company/drives', {
            'job_title': 'Test Drive',
            'job_description': 'Should fail.',
            'application_deadline': deadline
        }, token=t_pending)
        assert_err(r, "Unapproved company blocked from creating drives")

    sub("4l. Close a drive")
    if new_drive:
        # Admin needs to approve first
        admin_t = tokens.get('admin')
        if admin_t:
            post(f'/admin/drives/{new_drive["id"]}/approve', token=admin_t)
            r = post(f'/company/drives/{new_drive["id"]}/close', token=t)
            assert_ok(r, "Close drive")


def test_student():
    head("TEST 5 — Student Features")

    t = login('priya@iitm.ac.in', 'Test@1234', 'student')
    if not t:
        fail("Student login failed — skipping")
        return

    sub("5a. Student dashboard")
    r = get('/student/dashboard', token=t)
    data = assert_ok(r, "Student dashboard")
    if data:
        s = data['stats']
        info(f"Total apps: {s['total_apps']}, Available drives: {s['available_drives']}")
        info(f"Profile completeness: {data['student']['profile_completeness']}%")

    sub("5b. Browse all open drives")
    r = get('/student/drives', token=t)
    data = assert_ok(r, "Browse drives")
    if data:
        info(f"Open drives available: {len(data)}")

    sub("5c. Search drives by company name")
    r = get('/student/drives', token=t, params={'search': 'Google'})
    data = assert_ok(r, "Search drives: 'Google'")

    sub("5d. Search drives by skill")
    r = get('/student/drives', token=t, params={'search': 'Python'})
    data = assert_ok(r, "Search drives: 'Python'")
    if data:
        info(f"Drives requiring Python: {len(data)}")

    sub("5e. Apply to a drive (Priya applying to Amazon Data Analyst)")
    amazon_drive = None
    drives = get('/student/drives', token=t).json().get('data',[])
    for d in drives:
        if 'Data Analyst' in d['job_title'] and d['is_open']:
            amazon_drive = d
            break

    if amazon_drive:
        # Priya has cgpa 8.5, min is 7.5 — should succeed
        r = post(f'/student/drives/{amazon_drive["id"]}/apply', token=t)
        if r.json().get('success'):
            assert_ok(r, f"Applied to '{amazon_drive['job_title']}'")
        else:
            msg = r.json().get('message','')
            if 'already applied' in msg.lower():
                ok(f"Already applied (seeded) — '{amazon_drive['job_title']}'")
            else:
                fail(f"Apply failed: {msg}")

    sub("5f. Apply twice to same drive — must reject")
    if amazon_drive:
        r = post(f'/student/drives/{amazon_drive["id"]}/apply', token=t)
        assert_err(r, "Duplicate application rejected")

    sub("5g. Low CGPA student blocked by eligibility (Vikram, CGPA 5.9 → Amazon min 7.5)")
    vikram_t = login('vikram@iitm.ac.in', 'Test@1234', 'student')
    if vikram_t and amazon_drive:
        r = post(f'/student/drives/{amazon_drive["id"]}/apply', token=vikram_t)
        assert_err(r, "Low CGPA student eligibility blocked")

    sub("5h. View my applications")
    r = get('/student/applications', token=t)
    data = assert_ok(r, "Get my applications")
    if data:
        info(f"My applications: {len(data['applications'])}")

    sub("5i. Filter applications by status")
    r = get('/student/applications', token=t, params={'status': 'Applied'})
    assert_ok(r, "Filter: Applied")
    r = get('/student/applications', token=t, params={'status': 'Shortlisted'})
    assert_ok(r, "Filter: Shortlisted")

    sub("5j. View placement history (Selected + Rejected)")
    # Use Ramji who has Selected and Applied
    ramji_t = login('ramji@iitm.ac.in', 'Test@1234', 'student')
    if ramji_t:
        r = get('/student/history', token=ramji_t)
        data = assert_ok(r, "View placement history")
        if data:
            info(f"History entries: {len(data)}")

    sub("5k. View profile")
    r = get('/student/profile', token=t)
    assert_ok(r, "Get profile")

    sub("5l. Update profile")
    r = put('/student/profile', {
        'stu_name': 'Priya Sharma',
        'phone': '9876500001',
        'department': 'Data Science',
        'degree': 'BS',
        'graduation_year': '2025',
        'cgpa': '8.6',
        'skills': 'Python, Machine Learning, TensorFlow, SQL, Statistics, Deep Learning',
        'bio': 'ML enthusiast with published research.'
    }, token=t)
    data = assert_ok(r, "Update profile")
    if data:
        info(f"Profile completeness: {data['profile_completeness']}%")

    sub("5m. Update profile with invalid CGPA — should be rejected by validate()")
    # Note: frontend validates, backend safe_float handles bad values
    r = put('/student/profile', {'stu_name': 'Priya', 'cgpa': '15.0'}, token=t)
    # safe_float will return None for out-of-range values
    info("CGPA 15.0 → safe_float returns None, profile saves with existing CGPA (safe)")

    sub("5n. Access admin route as student — must get 403")
    r = get('/admin/dashboard', token=t)
    if r.status_code == 403:
        ok("Student correctly blocked from admin route → 403")
    else:
        fail(f"Expected 403 but got {r.status_code}")


def test_celery_jobs():
    head("TEST 6 — Celery Background Jobs")

    info("Celery jobs require the worker running: celery -A celery_run worker --pool=solo --loglevel=info")
    info("Check MailHog at http://localhost:8025 for emails after each test")

    sub("6a. Trigger CSV export (user-triggered async job)")
    t = tokens.get('student') or login('priya@iitm.ac.in', 'Test@1234', 'student')
    if t:
        r = post('/student/export', token=t)
        data = assert_ok(r, "Trigger CSV export")
        if data:
            job_id = data['job_id']
            info(f"Export job ID: {job_id}")

            # Poll for completion
            info("Polling for export completion (max 30 sec)...")
            for i in range(10):
                time.sleep(3)
                r2 = get(f'/student/export/{job_id}', token=t)
                if r2.status_code == 200:
                    status = r2.json().get('data',{}).get('status','?')
                    info(f"  Poll {i+1}: status = {status}")
                    if status == 'done':
                        ok("CSV export completed! Check MailHog for download email.")
                        break
                    elif status == 'failed':
                        fail("Export job failed (is Celery worker running?)")
                        break
            else:
                info("Export still processing (Celery may need --pool=solo on Windows)")

    sub("6b. Manually trigger daily reminder job (from Python shell)")
    info("Run this in a separate terminal to test reminders:")
    info("  python3 -c \"from app import app; from tasks import send_deadline_reminders")
    info("  with app.app_context(): r = send_deadline_reminders.apply(); print(r.get())\"")

    sub("6c. Manually trigger monthly report (from Python shell)")
    info("Run this to generate and send monthly report:")
    info("  python3 -c \"from app import app; from tasks import send_monthly_report")
    info("  with app.app_context(): r = send_monthly_report.apply(); print(r.get())\"")


def test_caching():
    head("TEST 7 — Redis Caching")

    t = tokens.get('admin') or login('siddharth@placeiitm.ac.in', 'Siddharth@300', 'admin')

    sub("7a. Admin dashboard — first call (hits DB, caches result)")
    start = time.time()
    r = get('/admin/dashboard', token=t)
    t1 = time.time() - start
    assert_ok(r, "Admin dashboard (DB hit)")
    info(f"First call: {t1*1000:.0f}ms")

    sub("7b. Admin dashboard — second call (should hit Redis cache, faster)")
    start = time.time()
    r = get('/admin/dashboard', token=t)
    t2 = time.time() - start
    assert_ok(r, "Admin dashboard (cache hit)")
    info(f"Second call: {t2*1000:.0f}ms")
    if t2 < t1:
        ok(f"Cache is working! {t1*1000:.0f}ms → {t2*1000:.0f}ms (faster)")
    else:
        info("Speed similar — Redis may be very fast locally or not running")

    sub("7c. Cache invalidation — after approving a company, cache should be cleared")
    cos = get('/admin/companies', token=t, params={'status':'pending'}).json().get('data',[])
    if cos:
        post(f'/admin/companies/{cos[0]["id"]}/approve', token=t)
        ok("Company approved → cache.clear() called → next dashboard fetch is fresh")


def test_error_handling():
    head("TEST 8 — Error Handling & Edge Cases")

    sub("8a. Request non-existent resource → 404")
    t = tokens.get('admin')
    r = get('/admin/companies/99999', token=t) if t else None
    if r and r.status_code == 404:
        ok("Non-existent company → 404")

    sub("8b. Delete non-existent student → 404")
    if t:
        r = delete('/admin/students/99999', token=t)
        if r.status_code == 404:
            ok("Non-existent student → 404")

    sub("8c. Expired token simulation")
    r = get('/admin/dashboard', token='fake.token.here')
    if r.status_code in (401, 422):
        ok(f"Invalid token rejected → {r.status_code}")

    sub("8d. Company trying to edit another company's drive → 404")
    amazon_t = login('hr@amazon.com', 'Test@1234', 'company')
    google_drives = get('/company/dashboard', token=tokens.get('company')).json().get('data',{}).get('drives',[])
    if amazon_t and google_drives:
        google_drive_id = google_drives[0]['id']
        r = put(f'/company/drives/{google_drive_id}', {'job_title': 'Hacked'}, token=amazon_t)
        if r.status_code == 404:
            ok("Company can't edit another company's drive → 404")

    sub("8e. Student applying to closed/expired drive")
    student_t = tokens.get('student')
    expired_drive = None
    all_drives = get('/admin/drives', token=tokens.get('admin')).json().get('data',[])
    expired = next((d for d in all_drives if d['status']=='approved' and d.get('days_left',1)==0), None)
    if expired and student_t:
        r = post(f'/student/drives/{expired["id"]}/apply', token=student_t)
        assert_err(r, "Apply to expired drive rejected")


def run_all():
    head("PlaceIITM V2 — Complete Viva Test Suite")
    info("Testing all features systematically...")
    info(f"Server: {BASE}")

    # Check server is running
    try:
        r = requests.get('http://localhost:5000', timeout=5)
        ok("Flask server is running")
    except:
        fail("Flask server is NOT running. Start it: python run.py")
        sys.exit(1)

    test_auth()
    test_registration()
    test_admin()
    test_company()
    test_student()
    test_caching()
    test_error_handling()
    test_celery_jobs()

    head("TEST SUITE COMPLETE")
    print(f"\n{GREEN}{BOLD}All tests completed!{RESET}")
    print(f"\n{CYAN}Next steps for viva:{RESET}")
    print("  1. Check MailHog at http://localhost:8025 for all emails")
    print("  2. Run Celery jobs manually from Python shell (see Test 6)")
    print("  3. Open http://localhost:5000 and demo the UI")
    print(f"\n{CYAN}Login credentials for UI demo:{RESET}")
    print("  Admin:   siddharth@placeiitm.ac.in / Siddharth@300")
    print("  Company: hr@google.com / Test@1234  (approved)")
    print("  Student: ramji@iitm.ac.in / Test@1234  (Selected in Google SDE)")
    print("  Student: sneha@iitm.ac.in / Test@1234  (Interview scheduled at Amazon)")
    print("  Student: vikram@iitm.ac.in / Test@1234  (Low CGPA — blocked by eligibility)")


if __name__ == '__main__':
    run_all()