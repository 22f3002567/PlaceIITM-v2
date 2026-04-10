window.StudentHistory = {
    name: 'StudentHistory',
    template: `
    <div>
        <h2>Placement History</h2>
        <p>Your final outcomes;-  all selected and rejected applications.</p>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else>

            <div v-if="history.length">
                <h3>Summary</h3>
                <table border="1" cellpadding="8" cellspacing="0">
                    <tr>
                        <th>Selected</th>
                        <th>Rejected</th>
                        <th>Total Closed</th>
                    </tr>
                    <tr>
                        <td style="color:green"><strong>{{ selectedCount }}</strong></td>
                        <td style="color:red"><strong>{{ rejectedCount }}</strong></td>
                        <td>{{ history.length }}</td>
                    </tr>
                </table>

                <h3>Full History</h3>
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Application ID</th>
                            <th>Student ID</th>
                            <th>Company</th>
                            <th>Drive Title</th>
                            <th>Job Type</th>
                            <th>Salary</th>
                            <th>Applied On</th>
                            <th>Last Updated</th>
                            <th>Outcome</th>
                            <th>Notes from Company</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="app in history" :key="app.id">
                            <td>{{ app.id }}</td>
                            <td>{{ app.student_id }}</td>
                            <td>{{ app.company_name }}</td>
                            <td>{{ app.job_title }}</td>
                            <td>{{ app.job_type || '-' }}</td>
                            <td>{{ app.salary_range || '-' }}</td>
                            <td>{{ formatDate(app.applied_at) }}</td>
                            <td>{{ formatDate(app.updated_at) }}</td>
                            <td>
                                <strong v-if="app.status === 'Selected'" style="color:green">✔ Selected</strong>
                                <strong v-else style="color:red">✘ Rejected</strong>
                            </td>
                            <td>{{ app.notes || '-' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-else>
                <p>No completed applications yet. Your selected and rejected outcomes will appear here.</p>
                <router-link to="/student/drives">Browse Drives →</router-link>
            </div>
        </div>
    </div>
    `,
    setup() {
        const { ref, computed, onMounted } = Vue;
        const loading = ref(true);
        const history = ref([]);

        const selectedCount = computed(() => history.value.filter(a => a.status === 'Selected').length);
        const rejectedCount = computed(() => history.value.filter(a => a.status === 'Rejected').length);

        async function load() {
            loading.value = true;
            try {
                const res = await API.student.getHistory();
                history.value = res.data.data;
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        onMounted(load);
        return { loading, history, selectedCount, rejectedCount, formatDate };
    }
};