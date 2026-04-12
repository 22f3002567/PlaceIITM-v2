// student/Dashboard.js

window.StudentDashboard = {
    name: 'StudentDashboard',
    template: `

    <div class="container py-4">
        <app-spinner v-if="loading" />
        <template v-else-if="data">

            <div class="ppa-page-header d-flex justify-content-between align-items-start">
                <div>
                    <h2>Dashboard</h2>
                    <p>Welcome back, {{ data.student.stu_name }}</p>
                </div>
                <router-link to="/student/drives" class="btn btn-primary">
                    <i class="bi bi-briefcase me-1"></i>Browse All Drives
                </router-link>
            </div>



            <!-- Profile completeness alert -->

            <div v-if="data.student.profile_completeness < 100"
                 class="alert alert-warning mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <i class="bi bi-person-exclamation me-2"></i>
                        <strong>Profile {{ data.student.profile_completeness }}% complete.</strong>
                        A complete profile improves your placement chances.
                        <router-link to="/student/profile" class="alert-link ms-1">Complete now →</router-link>
                    </div>
                    <span class="text-muted small fw-600">{{ data.student.profile_completeness }}%</span>
                </div>
                <div class="ppa-progress">
                    <div class="ppa-progress-bar"
                         :style="{
                             width: data.student.profile_completeness + '%',
                             background: data.student.profile_completeness < 50 ? '#dc2626'
                                       : data.student.profile_completeness < 80 ? '#d97706'
                                       : '#059669'
                         }">
                    </div>
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



            <!-- Available Drives -->

            <div class="ppa-card mb-4">
                <div class="card-body p-0">
                    <div class="p-4 pb-0 d-flex justify-content-between align-items-center">
                        <h5 class="fw-600 mb-0">Open Drives</h5>
                        <router-link to="/student/drives" class="btn btn-sm btn-outline-primary">
                            View All ({{ data.stats.available_drives }})
                        </router-link>
                    </div>
                    <div v-if="data.available_drives.length" class="table-responsive mt-3">
                        <table class="table ppa-table mb-0">
                            <thead>
                                <tr>
                                    <th>Company</th><th>Role</th><th>Type</th>
                                    <th>Salary</th><th>Deadline</th><th>Apply</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="drive in data.available_drives" :key="drive.id">
                                    <td class="fw-600">{{ drive.company_name }}</td>
                                    <td>{{ drive.job_title }}</td>
                                    <td class="text-muted small">{{ drive.job_type || '-' }}</td>
                                    <td class="text-muted small">{{ drive.salary_range || '-' }}</td>
                                    <td class="small" :class="daysLeftClass(drive.days_left)">
                                        {{ formatDate(drive.application_deadline) }}
                                        <div class="small">{{ daysLeftDisplay(drive.days_left) }}</div>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-primary"
                                                :disabled="applying === drive.id"
                                                @click="applyNow(drive)">
                                            <span v-if="applying === drive.id"
                                                  class="spinner-border spinner-border-sm"></span>
                                            <span v-else><i class="bi bi-send me-1"></i>Apply</span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <app-empty v-else
                        icon="bi bi-briefcase"
                        message="No new drives available right now."
                        subtext="Check back later or browse all drives." />
                </div>
            </div>



            <!-- Recent Applications -->

            <div class="ppa-card">
                <div class="card-body p-0">
                    <div class="p-4 pb-0 d-flex justify-content-between align-items-center">
                        <h5 class="fw-600 mb-0">Recent Applications</h5>
                        <router-link to="/student/applications" class="btn btn-sm btn-outline-primary">
                            View All
                        </router-link>
                    </div>
                    <div v-if="data.recent_apps.length" class="table-responsive mt-3">
                        <table class="table ppa-table mb-0">
                            <thead>
                                <tr><th>Company</th><th>Role</th><th>Applied</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                <tr v-for="app in data.recent_apps" :key="app.id">
                                    <td class="fw-600">{{ app.company_name }}</td>
                                    <td>{{ app.job_title }}</td>
                                    <td class="text-muted small">{{ formatDate(app.applied_at) }}</td>
                                    <td><status-badge :status="app.status" /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <app-empty v-else
                        icon="bi bi-send"
                        message="No applications yet."
                        subtext="Apply to a drive above to get started." />
                </div>
            </div>

        </template>
    </div>
    `,


    setup() {
        const { ref, onMounted } = Vue;
        const loading = ref(true);
        const data = ref(null);
        const applying = ref(null);

        const statCards = [
            { key: 'total_apps', label: 'Applied', icon: 'bi bi-send-fill', color: '#1a56db' },
            { key: 'shortlisted', label: 'Shortlisted', icon: 'bi bi-star-fill', color: '#d97706' },
            { key: 'interviews', label: 'Interviews', icon: 'bi bi-camera-video-fill', color: '#7c3aed' },
            { key: 'selected', label: 'Selected', icon: 'bi bi-patch-check-fill', color: '#059669' }
        ];

        async function load() {
            loading.value = true;
            try {
                const res = await API.student.dashboard();
                data.value = res.data.data;
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                loading.value = false;
            }
        }

        async function applyNow(drive) {
            applying.value = drive.id;
            try {
                await API.student.applyToDrive(drive.id);
                Store.Toast.success(`Applied to ${drive.job_title} at ${drive.company_name}!`);
                load(); // refreshed dashboard stats
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                applying.value = null;
            }
        }

        onMounted(load);
        return { loading, data, applying, statCards, applyNow, formatDate, daysLeftDisplay, daysLeftClass };
    }
};
