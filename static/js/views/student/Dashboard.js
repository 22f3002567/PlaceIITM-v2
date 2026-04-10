window.StudentDashboard = {
    name: 'StudentDashboard',
    template: `
    <div>
        <div v-if="loading"><p>Loading...</p></div>
        <div v-else-if="data">

            <h2>Student Dashboard</h2>
            <p>Welcome back, {{ data.student.full_name }}</p>
            <router-link to="/student/drives">Browse All Drives</router-link>

            <div v-if="data.student.profile_completeness < 100">
                <p>
                    Profile {{ data.student.profile_completeness }}% complete.
                    <router-link to="/student/profile">Complete your profile →</router-link>
                </p>
            </div>

            <h3>Your Stats</h3>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr>
                    <th>Total Applied</th>
                    <th>Shortlisted</th>
                    <th>Interviews</th>
                    <th>Selected</th>
                    <th>Available Drives</th>
                </tr>
                <tr>
                    <td>{{ data.stats.total_apps }}</td>
                    <td>{{ data.stats.shortlisted }}</td>
                    <td>{{ data.stats.interviews }}</td>
                    <td>{{ data.stats.selected }}</td>
                    <td>{{ data.stats.available_drives }}</td>
                </tr>
            </table>

            <h3>Open Drives ({{ data.stats.available_drives }} available)</h3>
            <div v-if="data.available_drives.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Company</th><th>Role</th><th>Type</th>
                            <th>Salary</th><th>Deadline</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="drive in data.available_drives" :key="drive.id">
                            <td>{{ drive.company_name }}</td>
                            <td>{{ drive.job_title }}</td>
                            <td>{{ drive.job_type || '-' }}</td>
                            <td>{{ drive.salary_range || '-' }}</td>
                            <td>
                                {{ drive.application_deadline }}
                                ({{ drive.days_left }} day(s) left)
                            </td>
                            <td>
                                <button
                                    :disabled="applying === drive.id"
                                    @click="applyNow(drive)">
                                    {{ applying === drive.id ? 'Applying...' : 'Apply Now' }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <p><router-link to="/student/drives">View all open drives →</router-link></p>
            </div>
            <p v-else>No new drives available right now. <router-link to="/student/drives">Browse all drives</router-link></p>

            <h3>Recent Applications</h3>
            <div v-if="data.recent_apps.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr><th>Company</th><th>Role</th><th>Applied On</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        <tr v-for="app in data.recent_apps" :key="app.id">
                            <td>{{ app.company_name }}</td>
                            <td>{{ app.job_title }}</td>
                            <td>{{ formatDate(app.applied_at) }}</td>
                            <td>{{ app.status }}</td>
                        </tr>
                    </tbody>
                </table>
                <p><router-link to="/student/applications">View all applications →</router-link></p>
            </div>
            <p v-else>No applications yet. <router-link to="/student/drives">Apply to a drive</router-link></p>

        </div>
    </div>
    `,
    setup() {
        const { ref, onMounted } = Vue;
        const loading  = ref(true);
        const data = ref(null);
        const applying = ref(null);

        async function load() {
            loading.value = true;
            try {
                const res = await API.student.dashboard();
                data.value = res.data.data;
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        async function applyNow(drive) {
            applying.value = drive.id;
            try {
                await API.student.applyToDrive(drive.id);
                Store.Toast.success(`Applied to ${drive.job_title} at ${drive.company_name}!`);
                load();
            } catch(e) { Store.handleApiError(e); }
            finally { applying.value = null; }
        }

        onMounted(load);
        return { loading, data, applying, applyNow, formatDate };
    }
};