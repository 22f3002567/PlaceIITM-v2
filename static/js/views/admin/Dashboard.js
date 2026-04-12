// admin/Dashboard.js

window.AdminDashboard = {
    name: 'AdminDashboard',

    template: `
    <div class="container py-4">
        <div class="ppa-page-header">
            <h2><i class="bi bi-grid me-2 text-primary"></i>Admin Dashboard</h2>
            <p>Welcome back, {{ user?.username }}. Here is everything at a glance.</p>
        </div>

        <app-spinner v-if="loading" />
        <template v-else-if="data">



            <!-- Pending alerts -->

            <div v-if="data.stats.pending_cos > 0 || data.stats.pending_drives > 0"
                 class="alert alert-warning d-flex align-items-center gap-2 mb-4">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <div>
                    <strong>Action Required :- </strong>
                    <span v-if="data.stats.pending_cos > 0">{{ data.stats.pending_cos }} company registration(s) awaiting approval. </span>
                    <span v-if="data.stats.pending_drives > 0">{{ data.stats.pending_drives }} placement drive(s) awaiting approval.</span>
                    <router-link to="/admin/companies" class="alert-link ms-2">Review →</router-link>
                </div>
            </div>



            <!-- Stat cards -->

            <div class="row g-3 mb-4">
                <div class="col-6 col-md-3" v-for="stat in statCards" :key="stat.label">
                    <div class="ppa-stat-card d-flex justify-content-between align-items-center">
                        <div>
                            <div class="stat-value">{{ data.stats[stat.key] }}</div>
                            <div class="stat-label">{{ stat.label }}</div>
                        </div>
                        <i :class="stat.icon + ' stat-icon'" :style="{color: stat.color}"></i>
                    </div>
                </div>
            </div>



            <!-- Application pipeline chart -->

            <div class="ppa-card mb-4">
                <div class="card-body p-4">
                    <h5 class="fw-600 mb-3">Application Pipeline</h5>
                    <canvas id="adminPipelineChart" height="80"></canvas>
                </div>
            </div>




            <!-- Quick actions -->

            <div class="ppa-card mb-4">
                <div class="card-body p-4">
                    <h5 class="fw-600 mb-3">Quick Actions</h5>
                    <div class="row g-2">
                        <div class="col-6 col-md-3" v-for="action in quickActions" :key="action.label">
                            <router-link :to="action.link" class="btn btn-outline-secondary w-100 text-start">
                                <i :class="action.icon + ' me-2'"></i>{{ action.label }}
                                <span v-if="action.badge" class="badge bg-warning text-dark ms-1">{{ action.badge }}</span>
                            </router-link>
                        </div>
                    </div>
                </div>
            </div>



            <!-- Recent Applications -->

            <div class="ppa-card mb-4">
                <div class="card-body p-0">
                    <div class="p-4 pb-0 d-flex justify-content-between align-items-center">
                        <h5 class="fw-600 mb-0">Recent Applications</h5>
                        <router-link to="/admin/applications" class="btn btn-sm btn-outline-primary">View All</router-link>
                    </div>
                    <div v-if="data.recent_apps.length" class="table-responsive">
                        <table class="table ppa-table mb-0">
                            <thead><tr>
                                <th>Student</th><th>Roll No</th><th>Company</th><th>Role</th><th>Applied</th><th>Status</th>
                            </tr></thead>
                            <tbody>
                                <tr v-for="app in data.recent_apps" :key="app.id">
                                    <td><div class="fw-600">{{ app.student_name }}</div><div class="text-muted small">{{ app.student_email }}</div></td>
                                    <td class="text-muted">{{ app.roll_no || '-' }}</td>
                                    <td>{{ app.company_name }}</td>
                                    <td>{{ app.job_title }}</td>
                                    <td class="text-muted small">{{ formatDate(app.applied_at) }}</td>
                                    <td><status-badge :status="app.status" /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <app-empty v-else icon="bi bi-file-earmark-check" message="No applications yet." />
                </div>
            </div>



            <!-- Recent Companies -->

            <div class="ppa-card">
                <div class="card-body p-0">
                    <div class="p-4 pb-0"><h5 class="fw-600 mb-0">Recently Registered Companies</h5></div>
                    <div v-if="data.recent_companies.length" class="table-responsive">
                        <table class="table ppa-table mb-0">
                            <thead><tr><th>Company</th><th>Industry</th><th>Location</th><th>Registered</th><th>Status</th></tr></thead>
                            <tbody>
                                <tr v-for="co in data.recent_companies" :key="co.id">
                                    <td class="fw-600">{{ co.company_name }}</td>
                                    <td class="text-muted small">{{ co.industry || '-' }}</td>
                                    <td class="text-muted small">{{ co.location || '-' }}</td>
                                    <td class="text-muted small">{{ formatDate(co.registered_at) }}</td>
                                    <td><status-badge :status="co.approval_status" /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <app-empty v-else icon="bi bi-building" message="No companies yet." />
                </div>
            </div>
        </template>
    </div>
    `,

    setup() {
        const { ref, computed, onMounted } = Vue;
        const loading = ref(true);
        const data = ref(null);
        const user = computed(() => Store.Auth.state.user);

        const statCards = [
            { key:'total_students', label:'Students', icon:'bi bi-people-fill', color:'#1a56db' },
            { key:'total_companies', label:'Companies', icon:'bi bi-building-fill', color:'#059669' },
            { key:'total_drives', label:'Drives Posted', icon:'bi bi-briefcase-fill', color:'#7c3aed' },
            { key:'total_apps', label:'Applications', icon:'bi bi-file-earmark-check-fill', color:'#d97706' },
            { key:'total_selected', label:'Selected', icon:'bi bi-patch-check-fill', color:'#059669' },
            { key:'pending_cos', label:'Pending Cos', icon:'bi bi-hourglass-split', color:'#d97706' },
            { key:'pending_drives', label:'Pending Drives', icon:'bi bi-clock', color:'#e22626' }
        ];

        const quickActions = computed(() => [
            { label:'Pending Companies', icon:'bi bi-building', link:'/admin/companies', badge: data.value?.stats.pending_cos || null },
            { label:'Pending Drives', icon:'bi bi-briefcase', link:'/admin/drives', badge: data.value?.stats.pending_drives || null },
            { label:'Manage Students', icon:'bi bi-people', link:'/admin/students' },
            { label:'All Applications', icon:'bi bi-list-check', link:'/admin/applications' }
        ]);



        let chart = null;

        async function drawChart(d) {
            await Vue.nextTick();
            const canvas = document.getElementById('adminPipelineChart');
            if (!canvas) return;
            if (chart) chart.destroy();
            const o = d.stats;
            chart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: ['Total Applied', 'Shortlisted', 'Selected', 'Rejected'],
                    datasets: [{
                        label: 'Applications',
                        data: [o.total_apps, o.total_apps - o.pending_cos, o.total_selected, o.total_apps - o.total_selected],
                        backgroundColor: ['#dbeafe','#fef3c7','#d1fae5','#fee2e2'],
                        borderColor: ['#1a56db','#d97706','#059669','#dc2626'],
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f4f6f9' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        onMounted(async () => {
            try {
                const res = await API.admin.dashboard();
                data.value = res.data.data;
                drawChart(res.data.data);
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                loading.value = false;
            }
        });

        return { loading, data, user, statCards, quickActions, formatDate };
    }
};







// admin/Companies.js


window.AdminCompanies = {
    name: 'AdminCompanies',


    template: `
    <div class="container py-4">
        <div class="ppa-page-header">
            <h2>Companies</h2>
            <p>Approve, manage and monitor registered companies.</p>
        </div>


        <!-- Search + filter -->

        <div class="ppa-card mb-4">
            <div class="card-body p-3">
                <div class="row g-2 align-items-end">
                    <div class="col-md-5">
                        <input v-model="search" class="form-control" placeholder="Search by name, industry or email...">
                    </div>
                    <div class="col-md-3">
                        <select v-model="statusFilter" class="form-select">
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-primary" @click="load"><i class="bi bi-search me-1"></i>Search</button>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-outline-secondary" @click="reset">Clear</button>
                    </div>
                </div>
            </div>
        </div>

        <app-spinner v-if="loading" />
        <div v-else class="ppa-card">
            <div class="card-body p-0">
                <div v-if="companies.length" class="table-responsive">
                    <table class="table ppa-table mb-0">
                        <thead><tr>
                            <th>#</th><th>Company</th><th>Industry</th><th>HR Contact</th>
                            <th>Drives</th><th>Status</th><th>Blacklisted</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            <tr v-for="co in companies" :key="co.id">
                                <td class="text-muted">{{ co.id }}</td>
                                <td>
                                    <div class="fw-600">{{ co.company_name }}</div>
                                    <div class="text-muted small">{{ co.email }}</div>
                                </td>
                                <td class="text-muted small">{{ co.industry || '-' }}</td>
                                <td class="text-muted small">{{ co.hr_name || '-' }}<br>{{ co.hr_contact || '' }}</td>
                                <td class="text-center">{{ co.total_drives }}</td>
                                <td><status-badge :status="co.approval_status" /></td>
                                <td>
                                    <span class="ppa-badge" :class="co.is_blacklisted ? 'badge-rejected' : 'badge-approved'">
                                        {{ co.is_blacklisted ? 'Yes' : 'No' }}
                                    </span>
                                </td>
                                <td>
                                    <div class="d-flex flex-wrap gap-1">
                                        <button v-if="co.approval_status !== 'approved'" class="btn btn-sm btn-success" @click="approve(co)">Approve</button>
                                        <button v-if="co.approval_status !== 'rejected'" class="btn btn-sm btn-warning" @click="reject(co)">Reject</button>
                                        <button class="btn btn-sm btn-outline-dark" @click="toggleBlacklist(co)">
                                            {{ co.is_blacklisted ? 'Unblacklist' : 'Blacklist' }}
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(co)">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <app-empty v-else icon="bi bi-building" message="No companies found." subtext="Try adjusting your search filters." />
            </div>
        </div>



        <!-- Confirm delete modal -->

        <confirm-modal
            v-if="deleteTarget"
            :title="'Delete ' + deleteTarget.company_name + '?'"
            message="This will permanently delete the company and all its drives and applications. This cannot be undone."
            confirm-text="Yes, Delete"
            @confirm="doDelete"
            @cancel="deleteTarget = null"
        />
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
            await API.admin.approveCompany(co.id);
            Store.Toast.success(`${co.company_name} approved.`);
            load();
        }

        async function reject(co) {
            await API.admin.rejectCompany(co.id);
            Store.Toast.warning(`${co.company_name} rejected.`);
            load();
        }

        async function toggleBlacklist(co) {
            await API.admin.blacklistCompany(co.id);
            Store.Toast.info(`${co.company_name} blacklist status toggled.`);
            load();
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
        return { loading, companies, search, statusFilter, deleteTarget, load, reset, approve, reject, toggleBlacklist, confirmDelete, doDelete };
    }
};










// admin/Students.js

window.AdminStudents = {
    name: 'AdminStudents',

    template: `
    <div class="container py-4">
        <div class="ppa-page-header">
            <h2>Students</h2>
            <p>View, search and manage all registered students.</p>
        </div>

        <div class="ppa-card mb-4">
            <div class="card-body p-3">
                <div class="row g-2 align-items-end">
                    <div class="col-md-4">
                        <label class="form-label fw-600 small">Search</label>
                        <input v-model="search" class="form-control" placeholder="Name, roll number, email or phone...">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label fw-600 small">Department</label>
                        <select v-model="deptFilter" class="form-select">
                            <option value="">All Departments</option>
                            <option v-for="d in departments" :key="d">{{ d }}</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label fw-600 small">Grad Year</label>
                        <select v-model="yearFilter" class="form-select">
                            <option value="">All Years</option>
                            <option v-for="y in gradYears" :key="y">{{ y }}</option>
                        </select>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-primary" @click="load"><i class="bi bi-search me-1"></i>Search</button>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-outline-secondary" @click="reset">Clear</button>
                    </div>
                </div>
            </div>
        </div>

        <app-spinner v-if="loading" />
        <div v-else class="ppa-card">
            <div class="card-body p-0">
                <div v-if="students.length" class="table-responsive">
                    <table class="table ppa-table mb-0">
                        <thead><tr>
                            <th>#</th><th>Name</th><th>Roll No</th><th>Department</th><th>CGPA</th>
                            <th>Applications</th><th>Status</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            <tr v-for="st in students" :key="st.id">
                                <td class="text-muted">{{ st.id }}</td>
                                <td>
                                    <div class="fw-600">{{ st.stu_name }}</div>
                                    <div class="text-muted small">{{ st.email }}</div>
                                </td>
                                <td class="text-muted">{{ st.roll_no || '-' }}</td>
                                <td class="text-muted small">{{ st.department || '-' }}</td>
                                <td>{{ st.cgpa || '-' }}</td>
                                <td class="text-center">{{ st.total_applications }}</td>
                                <td>
                                    <span class="ppa-badge" :class="st.is_blacklisted ? 'badge-rejected' : st.is_active ? 'badge-approved' : 'badge-closed'">
                                        {{ st.is_blacklisted ? 'Blacklisted' : st.is_active ? 'Active' : 'Inactive' }}
                                    </span>
                                </td>
                                <td>
                                    <div class="d-flex flex-wrap gap-1">
                                        <button class="btn btn-sm btn-outline-dark" @click="toggleBlacklist(st)">
                                            {{ st.is_blacklisted ? 'Unblacklist' : 'Blacklist' }}
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(st)">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <app-empty v-else icon="bi bi-people" message="No students found." />
            </div>
        </div>

        <confirm-modal
            v-if="deleteTarget"
            :title="'Delete ' + deleteTarget.stu_name + '?'"
            message="This will permanently delete the student and all their applications."
            confirm-text="Yes, Delete"
            @confirm="doDelete"
            @cancel="deleteTarget = null"
        />
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
            'Computer Science & Engineering', 
            'Data Science',
            'Electronics & Communication', 
            'Mathematics and Computing',
            'Electrical Engineering', 
            'Civil Engineering',
            'Aerospace Engineering', 
            'Other'
        ];
        const gradYears = [2024, 2025, 2026, 2027, 2028];

        async function load() {
            loading.value = true;
            try {
                const res = await API.admin.getStudents({
                    search: search.value,
                    department: deptFilter.value,
                    graduation_year: yearFilter.value
                });
                students.value = res.data.data;
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        function reset() { search.value = ''; deptFilter.value = ''; yearFilter.value = ''; load(); }

        async function toggleBlacklist(st) {
            await API.admin.blacklistStudent(st.id);
            Store.Toast.info(`${st.stu_name} blacklist status toggled.`);
            load();
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
        return { loading, students, search, deptFilter, yearFilter, departments, gradYears, deleteTarget, load, reset, toggleBlacklist, confirmDelete, doDelete };
    }
};









// admin/Drives.js

window.AdminDrives = {
    name: 'AdminDrives',

    template: `
    <div class="container py-4">
        <div class="ppa-page-header">
            <h2>Placement Drives</h2>
            <p>Approve, reject or close drives posted by companies.</p>
        </div>

        <div class="ppa-card mb-4">
            <div class="card-body p-3">
                <div class="row g-2">
                    <div class="col-md-5">
                        <input v-model="search" class="form-control" placeholder="Job title or company name...">
                    </div>
                    <div class="col-md-3">
                        <select v-model="statusFilter" class="form-select">
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-primary" @click="load">Search</button>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-outline-secondary" @click="reset">Clear</button>
                    </div>
                </div>
            </div>
        </div>

        <app-spinner v-if="loading" />
        <div v-else class="ppa-card">
            <div class="card-body p-0">
                <div v-if="drives.length" class="table-responsive">
                    <table class="table ppa-table mb-0">
                        <thead><tr>
                            <th>#</th><th>Company</th><th>Job Title</th><th>Type</th>
                            <th>Deadline</th><th>Apps</th><th>Status</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            <tr v-for="d in drives" :key="d.id">
                                <td class="text-muted">{{ d.id }}</td>
                                <td class="fw-600">{{ d.company_name }}</td>
                                <td>{{ d.job_title }}</td>
                                <td class="text-muted small">{{ d.job_type || '-' }}</td>
                                <td class="text-muted small" :class="daysLeftClass(d.days_left)">
                                    {{ d.application_deadline ? formatDate(d.application_deadline) : '-' }}
                                </td>
                                <td class="text-center">{{ d.total_applications }}</td>
                                <td><status-badge :status="d.status" /></td>
                                <td>
                                    <div class="d-flex gap-1 flex-wrap">
                                        <template v-if="d.status === 'pending'">
                                            <button class="btn btn-sm btn-success" @click="action(d.id, 'approve')">Approve</button>
                                            <button class="btn btn-sm btn-warning"  @click="action(d.id, 'reject')">Reject</button>
                                        </template>
                                        <button v-if="d.status === 'approved'" class="btn btn-sm btn-outline-secondary" @click="action(d.id, 'close')">Close</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <app-empty v-else icon="bi bi-briefcase" message="No drives found." />
            </div>
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
            const actions = { approve: API.admin.approveDrive, reject: API.admin.rejectDrive, close: API.admin.closeDrive };
            await actions[type](id);
            Store.Toast.success(`Drive ${type}d successfully.`);
            load();
        }

        onMounted(load);
        return { loading, drives, search, statusFilter, load, reset, action, formatDate, daysLeftClass };
    }
};









// admin/Applications.js

window.AdminApplications = {
    name: 'AdminApplications',

    template: `
    <div class="container py-4">
        <div class="ppa-page-header">
            <h2>All Applications</h2>
            <p>Complete view of all placement applications across the portal.</p>
        </div>

        <div class="ppa-card mb-4">
            <div class="card-body p-3">
                <div class="row g-2">
                    <div class="col-md-5">
                        <input v-model="search" class="form-control" placeholder="Student name, roll no, company or role...">
                    </div>
                    <div class="col-md-3">
                        <select v-model="statusFilter" class="form-select">
                            <option value="">All Statuses</option>
                            <option v-for="s in appStatuses" :key="s">{{ s }}</option>
                        </select>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-primary" @click="load">Search</button>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-outline-secondary" @click="reset">Clear</button>
                    </div>
                </div>
            </div>
        </div>

        <app-spinner v-if="loading" />
        <div v-else class="ppa-card">
            <div class="card-body p-0">
                <div v-if="applications.length" class="table-responsive">
                    <table class="table ppa-table mb-0">
                        <thead><tr>
                            <th>#</th><th>Student</th><th>Roll No</th><th>Company</th><th>Role</th><th>Applied</th><th>Status</th>
                        </tr></thead>
                        <tbody>
                            <tr v-for="app in applications" :key="app.id">
                                <td class="text-muted">{{ app.id }}</td>
                                <td>
                                    <div class="fw-600">{{ app.student_name }}</div>
                                    <div class="text-muted small">{{ app.student_email }}</div>
                                </td>
                                <td class="text-muted">{{ app.roll_no || '-' }}</td>
                                <td>{{ app.company_name }}</td>
                                <td>{{ app.job_title }}</td>
                                <td class="text-muted small">{{ formatDate(app.applied_at) }}</td>
                                <td><status-badge :status="app.status" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <app-empty v-else icon="bi bi-file-earmark-check" message="No applications found." />
            </div>
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










// admin/Reports.js ;- Placement Statistics & Reports

window.AdminReports = {
    name: 'AdminReports',

    template: `
    <div class="container py-4">
        <div class="ppa-page-header d-flex justify-content-between align-items-start">
            <div>
                <h2>Placement Statistics & Reports</h2>
                <p>Complete overview of placement activity across the portal.</p>
            </div>
            <button class="btn btn-outline-primary btn-sm" @click="load">
                <i class="bi bi-arrow-clockwise me-1"></i>Refresh
            </button>
        </div>

        <app-spinner v-if="loading" />
        <template v-else-if="stats">




            <!-- Overview stat cards -->


            <div class="row g-3 mb-4">
                <div class="col-6 col-md-3" v-for="card in overviewCards" :key="card.label">
                    <div class="ppa-stat-card">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="stat-value" :style="{color: card.color}">
                                    {{ card.key === 'placement_rate' ? card.value + '%' : card.value }}
                                </div>
                                <div class="stat-label">{{ card.label }}</div>
                            </div>
                            <i :class="card.icon + ' stat-icon fs-2'" :style="{color: card.color, opacity: 0.15}"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4 mb-4">




                <!-- Application pipeline -->


                <div class="col-md-6">
                    <div class="ppa-card h-100">
                        <div class="card-body p-4">
                            <h5 class="fw-600 mb-4">Application Pipeline</h5>
                            <div v-for="stage in pipeline" :key="stage.label" class="mb-3">
                                <div class="d-flex justify-content-between small mb-1">
                                    <span class="fw-600">{{ stage.label }}</span>
                                    <span class="text-muted">{{ stage.value }} ({{ stage.pct }}%)</span>
                                </div>
                                <div class="ppa-progress">
                                    <div class="ppa-progress-bar"
                                         :style="{width: stage.pct + '%', background: stage.color, transition: 'width 0.8s ease'}">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>




                <!-- Drives by status -->


                <div class="col-md-6">
                    <div class="ppa-card h-100">
                        <div class="card-body p-4">
                            <h5 class="fw-600 mb-4">Drives by Status</h5>
                            <div v-for="ds in driveStatusList" :key="ds.label" class="mb-3">
                                <div class="d-flex justify-content-between small mb-1">
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="ppa-badge" :class="ds.badge">{{ ds.label }}</span>
                                    </div>
                                    <span class="fw-600">{{ ds.value }}</span>
                                </div>
                                <div class="ppa-progress">
                                    <div class="ppa-progress-bar"
                                         :style="{width: ds.pct + '%', background: ds.color, transition: 'width 0.8s ease'}">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>




            <!-- Top companies by applicants -->


            <div class="ppa-card mb-4">
                <div class="card-body p-0">
                    <div class="p-4 pb-0">
                        <h5 class="fw-600 mb-0">Top Companies by Applications</h5>
                        <p class="text-muted small mt-1 mb-0">Approved companies ranked by total applicants received.</p>
                    </div>
                    <div v-if="stats.top_companies.length" class="table-responsive mt-3">
                        <table class="table ppa-table mb-0">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Company</th>
                                    <th>Drives</th>
                                    <th>Applicants</th>
                                    <th>Selected</th>
                                    <th>Selection Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(co, idx) in stats.top_companies" :key="co.name">
                                    <td class="text-muted">{{ idx + 1 }}</td>
                                    <td class="fw-600">{{ co.name }}</td>
                                    <td class="text-center">{{ co.drives }}</td>
                                    <td class="text-center">{{ co.apps }}</td>
                                    <td class="text-center">
                                        <span class="fw-600" style="color:#059669;">{{ co.selected }}</span>
                                    </td>
                                    <td>
                                        <div class="d-flex align-items-center gap-2">
                                            <div class="ppa-progress flex-grow-1" style="height:6px;">
                                                <div class="ppa-progress-bar"
                                                     :style="{width: selectionRate(co) + '%', background:'#059669'}">
                                                </div>
                                            </div>
                                            <span class="text-muted small" style="min-width:35px;">
                                                {{ selectionRate(co) }}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <app-empty v-else icon="bi bi-building" message="No company data yet." />
                </div>
            </div>





            <!-- Department-wise placement -->


            <div class="ppa-card">
                <div class="card-body p-0">
                    <div class="p-4 pb-0">
                        <h5 class="fw-600 mb-0">Department-wise Placement</h5>
                        <p class="text-muted small mt-1 mb-0">Students selected per department.</p>
                    </div>
                    <div v-if="stats.dept_stats.length" class="table-responsive mt-3">
                        <table class="table ppa-table mb-0">
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th>Total Students</th>
                                    <th>Selected</th>
                                    <th>Placement Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="d in stats.dept_stats" :key="d.department">
                                    <td class="fw-600">{{ d.department }}</td>
                                    <td class="text-center">{{ d.total }}</td>
                                    <td class="text-center fw-600" style="color:#059669;">{{ d.selected }}</td>
                                    <td>
                                        <div class="d-flex align-items-center gap-2">
                                            <div class="ppa-progress flex-grow-1" style="height:6px;">
                                                <div class="ppa-progress-bar"
                                                     :style="{
                                                         width: deptRate(d) + '%',
                                                         background: deptRate(d) >= 50 ? '#059669'
                                                                   : deptRate(d) >= 25 ? '#d97706'
                                                                   : '#dc2626'
                                                     }">
                                                </div>
                                            </div>
                                            <span class="text-muted small" style="min-width:40px;">
                                                {{ deptRate(d) }}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <app-empty v-else icon="bi bi-pie-chart" message="No placement data yet." />
                </div>
            </div>

        </template>
    </div>
    `,

    setup() {
        const { ref, computed, onMounted } = Vue;
        const loading = ref(true);
        const stats = ref(null);

        const overviewCards = computed(() => {
            if (!stats.value) return [];
            const o = stats.value.overview;
            return [
                { label:'Total Students', key:'total_students', value: o.total_students, icon:'bi bi-people-fill', color:'#1c59de' },
                { label:'Total Companies', key:'total_companies', value: o.total_companies, icon:'bi bi-building-fill', color:'#06a170' },
                { label:'Total Drives', key:'total_drives', value: o.total_drives, icon:'bi bi-briefcase-fill', color:'#7e3bf0' },
                { label:'Total Applications',key:'total_apps', value: o.total_apps, icon:'bi bi-send-fill', color:'#db7807' },
                { label:'Total Selected', key:'total_selected', value: o.total_selected, icon:'bi bi-patch-check-fill', color:'#079a6b' },
                { label:'Total Rejected', key:'total_rejected', value: o.total_rejected, icon:'bi bi-x-circle-fill', color:'#e32424' },
                { label:'Shortlisted', key:'total_shortlisted', value: o.total_shortlisted, icon:'bi bi-star-fill', color:'#de7a08' },
                { label:'Placement Rate', key:'placement_rate', value: o.placement_rate, icon:'bi bi-graph-up-arrow', color:'#04a16f' }
            ];
        });

        const pipeline = computed(() => {
            if (!stats.value) return [];
            const o = stats.value.overview;
            const total = o.total_apps || 1;
            return [
                { label:'Applied', value: o.total_apps, pct: 100, color:'#1a56db' },
                { label:'Shortlisted', value: o.total_shortlisted, pct: Math.round(o.total_shortlisted/total*100), color:'#d97706' },
                { label:'Interview', value: o.total_apps - o.total_selected - o.total_rejected - o.total_shortlisted > 0
                                              ? o.total_apps - o.total_selected - o.total_rejected - o.total_shortlisted
                                              : 0,
                                       pct: 0, color:'#7c3aed' },
                { label:'Selected', value: o.total_selected, pct: Math.round(o.total_selected/total*100),        color:'#059669' },
                { label:'Rejected', value: o.total_rejected, pct: Math.round(o.total_rejected/total*100),        color:'#dc2626' }
            ];
        });

        const driveStatusList = computed(() => {
            if (!stats.value) return [];
            const d = stats.value.drives_by_status;
            const total = (d.pending + d.approved + d.rejected + d.closed) || 1;
            return [
                { label:'Approved', value: d.approved, pct: Math.round(d.approved/total*100), color:'#059669', badge:'badge-approved'},
                { label:'Pending', value: d.pending, pct: Math.round(d.pending/total*100), color:'#d97706', badge:'badge-pending'},
                { label:'Closed', value: d.closed, pct: Math.round(d.closed/total*100), color:'#6b7280', badge:'badge-closed'},
                { label:'Rejected', value: d.rejected, pct: Math.round(d.rejected/total*100), color:'#dc2626', badge:'badge-rejected'}
            ];
        });

        function selectionRate(co) {
            return co.apps ? Math.round((co.selected / co.apps) * 100) : 0;
        }
        function deptRate(d) {
            return d.total ? Math.round((d.selected / d.total) * 100) : 0;
        }

        async function load() {
            loading.value = true;
            try {
                const res = await API.admin.getStats();
                stats.value = res.data.data;
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                loading.value = false;
            }
        }

        onMounted(load);
        return { loading, stats, overviewCards, pipeline, driveStatusList, selectionRate, deptRate, load };
    }
};

