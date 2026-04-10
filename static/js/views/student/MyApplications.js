window.StudentMyApplications = {
    name: 'StudentMyApplications',
    template: `
    <div>
        <h2>My Applications</h2>
        <p>Track status of all your placement applications.</p>

        <div>
            <strong>Filter by status: </strong>
            <button @click="statusFilter = ''">All ({{ applications.length }})</button>
            <button v-for="s in appStatuses" :key="s" @click="statusFilter = s">
                {{ s }} ({{ applications.filter(a => a.status === s).length }})
            </button>
        </div>
        <br>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else>
            <p>Showing {{ filteredApps.length }} application(s)</p>

            <div v-if="filteredApps.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr>
                            <th>App ID</th>
                            <th>Company</th>
                            <th>Role</th>
                            <th>Type</th>
                            <th>Salary</th>
                            <th>Applied On</th>
                            <th>Status</th>
                            <th>Interview Details</th>
                            <th>Company Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="app in filteredApps" :key="app.id">
                            <td>{{ app.id }}</td>
                            <td>{{ app.company_name }}</td>
                            <td>{{ app.job_title }}</td>
                            <td>{{ app.job_type || '-' }}</td>
                            <td>{{ app.salary_range || '-' }}</td>
                            <td>{{ formatDate(app.applied_at) }}</td>
                            <td>
                                <strong>{{ app.status }}</strong>
                                <div v-if="app.status === 'Selected'" style="color:green">🎉 Congratulations!</div>
                                <div v-if="app.status === 'Rejected'" style="color:red">Not selected this time.</div>
                            </td>
                            <td>
                                <span v-if="app.interview_date">
                                    Date: {{ formatDate(app.interview_date) }}<br>
                                    Mode: {{ app.interview_mode || '-' }}<br>
                                    Location: {{ app.interview_location || '-' }}
                                </span>
                                <span v-else>-</span>
                            </td>
                            <td>{{ app.notes || '-' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-else>
                <p>No applications found for this filter.</p>
                <router-link to="/student/drives">Browse Drives →</router-link>
            </div>
        </div>
    </div>
    `,
    setup() {
        const { ref, computed, onMounted } = Vue;
        const loading = ref(true);
        const applications = ref([]);
        const statusFilter = ref('');
        const appStatuses = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

        const filteredApps = computed(() => {
            if (!statusFilter.value) return applications.value;
            return applications.value.filter(a => a.status === statusFilter.value);
        });

        async function load() {
            loading.value = true;
            try {
                const res = await API.student.getApplications();
                applications.value = res.data.data.applications;
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        onMounted(load);
        return { loading, applications, filteredApps, statusFilter, appStatuses, formatDate };
    }
};