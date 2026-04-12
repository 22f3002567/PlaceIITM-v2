// student/History.js

window.StudentHistory = {

    name: 'StudentHistory',

    template: `
    <div class="container py-4">
        <div class="ppa-page-header">
            <h2>Placement History</h2>
            <p>Your final outcomes :- all selected and rejected applications.</p>
        </div>

        <app-spinner v-if="loading" />
        <template v-else>

            <!-- Summary strip -->
            <div v-if="history.length" class="row g-3 mb-4">
                <div class="col-6 col-md-3">
                    <div class="ppa-stat-card text-center py-3">
                        <div class="stat-value" style="color:#059669;">{{ selectedCount }}</div>
                        <div class="stat-label">Selected</div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="ppa-stat-card text-center py-3">
                        <div class="stat-value" style="color:#dc2626;">{{ rejectedCount }}</div>
                        <div class="stat-label">Rejected</div>
                    </div>
                </div>
            </div>

            <div v-if="history.length" class="ppa-card">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table ppa-table mb-0">
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Role</th>
                                    <th>Type</th>
                                    <th>Salary</th>
                                    <th>Applied On</th>
                                    <th>Outcome</th>
                                    <th>Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="app in history" :key="app.id">
                                    <td class="fw-600">{{ app.company_name }}</td>
                                    <td>{{ app.job_title }}</td>
                                    <td class="text-muted small">{{ app.job_type || '-' }}</td>
                                    <td class="text-muted small">{{ app.salary_range || '-' }}</td>
                                    <td class="text-muted small">{{ formatDate(app.applied_at) }}</td>
                                    <td>
                                        <span v-if="app.status === 'Selected'"
                                              class="ppa-badge badge-selected">
                                            <i class="bi bi-patch-check me-1"></i>Selected
                                        </span>
                                        <span v-else class="ppa-badge badge-rejected">
                                            <i class="bi bi-x-circle me-1"></i>Rejected
                                        </span>
                                    </td>
                                    <td class="text-muted small">{{ app.notes || '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>


            <app-empty v-else
                icon="bi bi-clock-history"
                message="No completed applications yet."
                subtext="Your selected and rejected outcomes will appear here.">
                <router-link to="/student/drives" class="btn btn-sm btn-primary mt-2">
                    Browse Drives
                </router-link>
            </app-empty>
        </template>
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
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                loading.value = false;
            }
        }

        onMounted(load);
        return { loading, history, selectedCount, rejectedCount, formatDate };
    }
};
