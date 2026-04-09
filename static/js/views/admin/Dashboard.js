window.AdminDashboard = {
    name: "AdminDashboard",
    template: `
    <div>
        <h2>Admin Dashboard</h2>
        <p>Welcome, {{ user?.username }}!</p>

        <div v-if="loading">
            <p>Loading data...</p>
        </div>
        <div v-else-if="data">
            <div v-if="data.stats.pending_cos > 0 || data.stats.pending_drives > 0">
                <p>
                    <strong>Action Required:- </strong>
                    <span v-if="data.stats.pending_cos > 0">{{ data.stats.pending_cos}} company registration(s) pending approval. </span>
                    <span v-if="data.stats.pending_drives >0">{{ data.stats.pending_drives}} drive(s) pending approval. </span>
                    <router-link to="/admin/companies">Review Pleasee -></router-link>
                </p>
            </div>
                    
            <h3>Overview</h3>
            <table border="1" cellpadding="5" cellspacing="0">
                <tr>
                    <th>Total Students</th>
                    <th>Total Companies</th>
                    <th>Total Drives</th>
                    <th>Total Applications</th>
                    <th>Total Selected</th>
                    <th>Pending Companiness</th>
                    <th>Pending Drives</th>
                </tr>
                <tr>
                    <th>{{ data.stats.total_students }}</th>
                    <th>{{ data.stats.total_companies }}</th>
                    <th>{{ data.stats.total_drives }}</th>
                    <th>{{ data.stats.total_apps }}</th>
                    <th>{{ data.stats.total_selected }}</th>
                    <th>{{ data.stats.pending_cos }}</th>
                    <th>{{ data.stats.pending_drives }}</th>
                </tr>

            </table>

            <br>
            
            <h3>Quick Actions</h3>
            <p>
                <router-link to="/admin/companies">Manage Companies</router-link> |
                <router-link to="/admin/students">Manage Students</router-link> |
                <router-link to="/admin/drives">Manage Drives</router-link> |
                <router-link to="/admin/applications">All Applications</router-link> |
                <router-link to="/admin/reports">Reports</router-link>
            </p>

            <h3>Recent Applications</h3>
            <div v-if="data.recent_apps.length">
                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Student</th><th>Roll No</th><th>Company</th>
                            <th>ROle</th><th>Applied</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="app in data.recent_apps" :key="app.id">
                            <td>{{ app.stu_name }}<br><small>{{ app.student_email }}</small></td>
                            <td>{{ app.roll_no || '-' }}</td>
                            <td>{{ app.co_name }}</td>
                            <td>{{ app.job_title }}</td>
                            <td>{{ formatDate(app.applied_at) }}</td>
                            <td>{{ app.status }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else>
                No recent applications yet sir...
            </p>

            <h3>Recently Registered Companies</h3>
            <div v-if="data.recent_cos.length">
                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Company Name</th><th>Industry</th><th>Location</th><th>Registered at</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="co in data.recent_cos" :key="co.id">
                            <td>{{ co.co_name }}</td>
                            <td>{{ co.industry  || '-' }}</td>
                            <td>{{ co.location || '-' }}</td>
                            <td>{{ formatDate(co.registered_at) }}</td>
                            <td>{{ co.approval_status }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else>
                No new company registrations yet sir...
            </p>
        </div>
    </div>
    `,
    setup() {
        const { ref, computed, onMounted } = Vue;
        const loading = ref(true);
        const data = ref(null);
        const user = computed(() => Store.Auth.state.user);

        onMounted(async () => {
            try {
                const res = await API.admin.dashboard();
                data.value = res.data.data;
            } catch (e) {
                console.error("Failed to load dashboard data:", err);
                alert("Failed to load dashboard data. Please try again later.");
                Store.handleError(e);
            } finally {
                loading.value = false;
            }
        });

        return { loading, data, user, formatDate };
        
    }
};






window.AdminCompanies = {
    name: "AdminCompanies",
    template: `
    <div>
        <h2>Companies</h2>

        <div>
            <input v-model="search" placeholder="Search by name, industry or email" />
            <select v-model="statusFilter">
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
            </select>
            <button @click="load">Search</button>
            <button @click="reset">Clear</button>
        </div>
        <br>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else>
            <p>Total: {{ companies.length }} companies</p>
            <div v-if="companies.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr>
                            <th>#</th><th>Company</th><th>Industry</th>
                            <th>HR Contact</th><th>Drives</th>
                            <th>Status</th><th>Blacklisted</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="co in companies" :key="co.id">
                            <td>{{ co.id }}</td>
                            <td>{{ co.company_name }}<br><small>{{ co.email }}</small></td>
                            <td>{{ co.industry || '—' }}</td>
                            <td>{{ co.hr_name || '—' }}<br>{{ co.hr_contact || '' }}</td>
                            <td>{{ co.total_drives }}</td>
                            <td>{{ co.approval_status }}</td>
                            <td>{{ co.is_blacklisted ? 'Yes' : 'No' }}</td>
                            <td>
                                <button v-if="co.approval_status !== 'approved'" @click="approve(co)">Approve</button>
                                <button v-if="co.approval_status !== 'rejected'" @click="reject(co)">Reject</button>
                                <button @click="toggleBlacklist(co)">{{ co.is_blacklisted ? 'Unblacklist' : 'Blacklist' }}</button>
                                <button @click="confirmDelete(co)">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else>No companies found.</p>
        </div>

        <div v-if="deleteTarget">
            <p><strong>Delete {{ deleteTarget.company_name }}?</strong> This cannot be undone.</p>
            <button @click="doDelete">Yes, Delete</button>
            <button @click="deleteTarget = null">Cancel</button>
        </div>
    </div>
    `,
    setup() {
        const { ref, onMounted } = Vue;
        const loading = ref(true);
        const companies = ref([]);
        const search = ref('');
        const statusFilter = ref('');
        const deleteTarget = ref(null);

        async function load() {
            loading.value = true;
            try {
                const res = await API.admin.getCompanies({ search: search.value, status: statusFilter.value });
                companies.value = res.data.data;
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        function reset() { search.value = ''; statusFilter.value = ''; load(); }

        async function approve(co) {
            try { await API.admin.approveCompany(co.id); Store.Toast.success(`${co.company_name} approved.`); load(); }
            catch(e) { Store.handleApiError(e); }
        }
        async function reject(co) {
            try { await API.admin.rejectCompany(co.id); Store.Toast.warning(`${co.company_name} rejected.`); load(); }
            catch(e) { Store.handleApiError(e); }
        }
        async function toggleBlacklist(co) {
            try { await API.admin.blacklistCompany(co.id); Store.Toast.info('Blacklist status toggled.'); load(); }
            catch(e) { Store.handleApiError(e); }
        }
        function confirmDelete(co) { deleteTarget.value = co; }
        async function doDelete() {
            try {
                await API.admin.deleteCompany(deleteTarget.value.id);
                Store.Toast.success(`${deleteTarget.value.company_name} deleted.`);
                deleteTarget.value = null;
                load();
            } catch(e) { Store.handleApiError(e); }
        }

        onMounted(load);
        return { loading, companies, search, statusFilter, deleteTarget,
                 load, reset, approve, reject, toggleBlacklist, confirmDelete, doDelete };
    }
};




window.AdminStudents = {
    name: 'AdminStudents',
    template: `
    <div>
        <h2>Students</h2>

        <div>
            <input v-model="search" placeholder="Name, roll number, email or phone" />
            <select v-model="deptFilter">
                <option value="">All Departments</option>
                <option v-for="d in departments" :key="d">{{ d }}</option>
            </select>
            <select v-model="yearFilter">
                <option value="">All Grad Years</option>
                <option v-for="y in gradYears" :key="y">{{ y }}</option>
            </select>
            <button @click="load">Search</button>
            <button @click="reset">Clear</button>
        </div>
        <br>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else>
            <p>Total: {{ students.length }} students</p>
            <div v-if="students.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr>
                            <th>#</th><th>Name</th><th>Roll No</th>
                            <th>Department</th><th>CGPA</th>
                            <th>Applications</th><th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="st in students" :key="st.id">
                            <td>{{ st.id }}</td>
                            <td>{{ st.stu_name }}<br><small>{{ st.email }}</small></td>
                            <td>{{ st.roll_no || '—' }}</td>
                            <td>{{ st.department || '—' }}</td>
                            <td>{{ st.cgpa || '—' }}</td>
                            <td>{{ st.total_apps }}</td>
                            <td>{{ st.is_blacklisted ? 'Blacklisted' : st.is_active ? 'Active' : 'Inactive' }}</td>
                            <td>
                                <button @click="toggleBlacklist(st)">{{ st.is_blacklisted ? 'Unblacklist' : 'Blacklist' }}</button>
                                <button @click="confirmDelete(st)">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else>No students found.</p>
        </div>

        <div v-if="deleteTarget">
            <p><strong>Delete {{ deleteTarget.stu_name }}?</strong> All their applications will be deleted.</p>
            <button @click="doDelete">Yes, Delete</button>
            <button @click="deleteTarget = null">Cancel</button>
        </div>
    </div>
    `,
    setup() {
        const { ref, onMounted } = Vue;
        const loading = ref(true);
        const students = ref([]);
        const search = ref('');
        const deptFilter = ref('');
        const yearFilter = ref('');
        const deleteTarget = ref(null);

        const departments = [
            'Computer Science & Engineering','Data Science','Electronics & Communication',
            'Mathematics and Computing','Electrical Engineering','Civil Engineering',
            'Aerospace Engineering','Other'
        ];
        const gradYears = [2024, 2025, 2026, 2027, 2028];

        async function load() {
            loading.value = true;
            try {
                const res = await API.admin.getStudents({
                    search: search.value, department: deptFilter.value,
                    graduation_year: yearFilter.value
                });
                students.value = res.data.data;
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        function reset() { search.value = ''; deptFilter.value = ''; yearFilter.value = ''; load(); }

        async function toggleBlacklist(st) {
            try { await API.admin.blacklistStudent(st.id); Store.Toast.info('Blacklist status toggled.'); load(); }
            catch(e) { Store.handleApiError(e); }
        }
        function confirmDelete(st) { deleteTarget.value = st; }
        async function doDelete() {
            try {
                await API.admin.deleteStudent(deleteTarget.value.id);
                Store.Toast.success(`${deleteTarget.value.stu_name} deleted.`);
                deleteTarget.value = null;
                load();
            } catch(e) { Store.handleApiError(e); }
        }

        onMounted(load);
        return { loading, students, search, deptFilter, yearFilter, departments, gradYears,
                 deleteTarget, load, reset, toggleBlacklist, confirmDelete, doDelete };
    }
};




window.AdminDrives = {
    name: 'AdminDrives',
    template: `
    <div>
        <h2>Placement Drives</h2>

        <div>
            <input v-model="search" placeholder="Job title or company name" />
            <select v-model="statusFilter">
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
            </select>
            <button @click="load">Search</button>
            <button @click="reset">Clear</button>
        </div>
        <br>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else>
            <p>Total: {{ drives.length }} drives</p>
            <div v-if="drives.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr>
                            <th>#</th><th>Company</th><th>Job Title</th><th>Type</th>
                            <th>Deadline</th><th>Applicants</th><th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="d in drives" :key="d.id">
                            <td>{{ d.id }}</td>
                            <td>{{ d.company_name }}</td>
                            <td>{{ d.job_title }}</td>
                            <td>{{ d.job_type || '—' }}</td>
                            <td>{{ d.application_deadline || '—' }}</td>
                            <td>{{ d.total_applications }}</td>
                            <td>{{ d.status }}</td>
                            <td>
                                <template v-if="d.status === 'pending'">
                                    <button @click="action(d.id, 'approve')">Approve</button>
                                    <button @click="action(d.id, 'reject')">Reject</button>
                                </template>
                                <button v-if="d.status === 'approved'" @click="action(d.id, 'close')">Close</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else>No drives found.</p>
        </div>
    </div>
    `,
    setup() {
        const { ref, onMounted } = Vue;
        const loading = ref(true);
        const drives = ref([]);
        const search = ref('');
        const statusFilter = ref('');

        async function load() {
            loading.value = true;
            try {
                const res = await API.admin.getDrives({ search: search.value, status: statusFilter.value });
                drives.value = res.data.data;
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        function reset() { search.value = ''; statusFilter.value = ''; load(); }

        async function action(id, type) {
            try {
                const actions = { approve: API.admin.approveDrive, reject: API.admin.rejectDrive, close: API.admin.closeDrive };
                await actions[type](id);
                Store.Toast.success(`Drive ${type}d.`);
                load();
            } catch(e) { Store.handleApiError(e); }
        }

        onMounted(load);
        return { loading, drives, search, statusFilter, load, reset, action };
    }
};


window.AdminApplications = {
    name: 'AdminApplications',
    template: `
    <div>
        <h2>All Applications</h2>

        <div>
            <input v-model="search" placeholder="Student name, roll no, company or role" />
            <select v-model="statusFilter">
                <option value="">All Statuses</option>
                <option v-for="s in appStatuses" :key="s">{{ s }}</option>
            </select>
            <button @click="load">Search</button>
            <button @click="reset">Clear</button>
        </div>
        <br>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else>
            <p>Total: {{ applications.length }} applications</p>
            <div v-if="applications.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr>
                            <th>#</th><th>Student</th><th>Roll No</th>
                            <th>Company</th><th>Role</th><th>Applied</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="app in applications" :key="app.id">
                            <td>{{ app.id }}</td>
                            <td>{{ app.student_name }}<br><small>{{ app.student_email }}</small></td>
                            <td>{{ app.roll_no || '—' }}</td>
                            <td>{{ app.company_name }}</td>
                            <td>{{ app.job_title }}</td>
                            <td>{{ formatDate(app.applied_at) }}</td>
                            <td>{{ app.status }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else>No applications found.</p>
        </div>
    </div>
    `,
    setup() {
        const { ref, onMounted } = Vue;
        const loading = ref(true);
        const applications = ref([]);
        const search = ref('');
        const statusFilter = ref('');
        const appStatuses = ['Applied','Shortlisted','Interview','Selected','Rejected'];

        async function load() {
            loading.value = true;
            try {
                const res = await API.admin.getApplications({ search: search.value, status: statusFilter.value });
                applications.value = res.data.data;
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        function reset() { search.value = ''; statusFilter.value = ''; load(); }

        onMounted(load);
        return { loading, applications, search, statusFilter, appStatuses, load, reset, formatDate };
    }
};

window.AdminReports = {
    name: 'AdminReports',
    template: `
    <div>
        <h2>Placement Reports & Statistics</h2>
        <button @click="load">Refresh</button>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else-if="stats">

            <h3>Overview</h3>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr>
                    <th>Students</th><th>Companies</th><th>Drives</th>
                    <th>Applications</th><th>Selected</th><th>Rejected</th>
                    <th>Shortlisted</th><th>Placement Rate</th>
                </tr>
                <tr>
                    <td>{{ stats.overview.total_students }}</td>
                    <td>{{ stats.overview.total_companies }}</td>
                    <td>{{ stats.overview.total_drives }}</td>
                    <td>{{ stats.overview.total_apps }}</td>
                    <td>{{ stats.overview.total_selected }}</td>
                    <td>{{ stats.overview.total_rejected }}</td>
                    <td>{{ stats.overview.total_shortlisted }}</td>
                    <td>{{ stats.overview.placement_rate }}%</td>
                </tr>
            </table>

            <h3>Drives by Status</h3>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr>
                    <th>Pending</th><th>Approved</th><th>Rejected</th><th>Closed</th>
                </tr>
                <tr>
                    <td>{{ stats.drives_by_status.pending }}</td>
                    <td>{{ stats.drives_by_status.approved }}</td>
                    <td>{{ stats.drives_by_status.rejected }}</td>
                    <td>{{ stats.drives_by_status.closed }}</td>
                </tr>
            </table>

            <h3>Top Companies by Applications</h3>
            <div v-if="stats.top_companies.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr><th>#</th><th>Company</th><th>Drives</th><th>Applicants</th><th>Selected</th></tr>
                    </thead>
                    <tbody>
                        <tr v-for="(co, idx) in stats.top_companies" :key="co.name">
                            <td>{{ idx + 1 }}</td>
                            <td>{{ co.name }}</td>
                            <td>{{ co.drives }}</td>
                            <td>{{ co.apps }}</td>
                            <td>{{ co.selected }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else>No company data yet.</p>

            <h3>Department-wise Placement</h3>
            <div v-if="stats.dept_stats.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr><th>Department</th><th>Total Students</th><th>Selected</th></tr>
                    </thead>
                    <tbody>
                        <tr v-for="d in stats.dept_stats" :key="d.department">
                            <td>{{ d.department }}</td>
                            <td>{{ d.total }}</td>
                            <td>{{ d.selected }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else>No department data yet.</p>
        </div>
    </div>
    `,
    setup() {
        const { ref, onMounted } = Vue;
        const loading = ref(true);
        const stats = ref(null);

        async function load() {
            loading.value = true;
            try {
                const res = await API.admin.getStats();
                stats.value = res.data.data;
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        onMounted(load);
        return { loading, stats, load };
    }
};