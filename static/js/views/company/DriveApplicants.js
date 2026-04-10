window.CompanyDriveApplicants = {
    name: 'CompanyDriveApplicants',
    template: `
    <div>
        <router-link to="/company/dashboard">← Back to Dashboard</router-link>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else-if="data">

            <h2>{{ data.drive.job_title }}</h2>
            <p>
                Status: {{ data.drive.status }} |
                {{ data.drive.job_type || '' }}
                <span v-if="data.drive.location"> | {{ data.drive.location }}</span>
                <span v-if="data.drive.application_deadline"> | Deadline: {{ data.drive.application_deadline }}</span>
            </p>

            <h3>Applicant Summary</h3>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr>
                    <th>Total Applied</th><th>Shortlisted</th><th>Interview</th><th>Selected</th>
                </tr>
                <tr>
                    <td>{{ data.applications.length }}</td>
                    <td>{{ data.applications.filter(a => a.status === 'Shortlisted').length }}</td>
                    <td>{{ data.applications.filter(a => a.status === 'Interview').length }}</td>
                    <td>{{ data.applications.filter(a => a.status === 'Selected').length }}</td>
                </tr>
            </table>

            <h3>Filter by Status</h3>
            <button @click="statusFilter = ''">All</button>
            <button v-for="s in data.app_statuses" :key="s" @click="statusFilter = s">{{ s }}</button>

            <h3>Applicants ({{ filteredApps.length }})</h3>
            <div v-if="filteredApps.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Name</th><th>Roll No</th><th>Dept / Degree</th>
                            <th>CGPA</th><th>Skills</th><th>Resume</th>
                            <th>Applied</th><th>Status</th><th>Update</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="app in filteredApps" :key="app.id">
                            <td>{{ app.student_name }}</td>
                            <td>{{ app.roll_no || ''- }}</td>
                            <td>{{ app.department || '-' }}<br>{{ app.degree || '' }}</td>
                            <td>{{ app.cgpa || '-' }}</td>
                            <td>{{ app.skills || '-' }}</td>
                            <td>
                                <a v-if="app.resume_filename"
                                   :href="API.resumeUrl(app.resume_filename)"
                                   target="_blank">View PDF</a>
                                <span v-else>None</span>
                            </td>
                            <td>{{ formatDate(app.applied_at) }}</td>
                            <td>{{ app.status }}</td>
                            <td>
                                <div v-if="editing === app.id">
                                    <select v-model="editForm.status">
                                        <option v-for="s in data.app_statuses" :key="s">{{ s }}</option>
                                    </select><br>
                                    <input v-model="editForm.notes" placeholder="Notes / feedback" /><br>
                                    <template v-if="editForm.status === 'Interview'">
                                        <input v-model="editForm.interview_date" type="datetime-local" /><br>
                                        <input v-model="editForm.interview_mode" placeholder="Online / Offline" /><br>
                                        <input v-model="editForm.interview_location" placeholder="Location / meeting link" /><br>
                                    </template>
                                    <button @click="saveUpdate(app)">Save</button>
                                    <button @click="editing = null">Cancel</button>
                                </div>
                                <button v-else @click="startEdit(app)">Update</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else>No applicants match this filter.</p>
        </div>
    </div>
    `,
    setup() {
        const { ref, reactive, computed, onMounted } = Vue;
        const route = VueRouter.useRoute();
        const loading = ref(true);
        const data = ref(null);

        const statusFilter = ref('');
        const editing = ref(null);
        const editForm = reactive({
            status: '', notes: '',
            interview_date: '', interview_mode: '', interview_location: ''
        });

        const filteredApps = computed(() => {
            if (!data.value) return [];
            if (!statusFilter.value) return data.value.applications;
            return data.value.applications.filter(a => a.status === statusFilter.value);
        });

        async function load() {
            loading.value = true;
            try {
                const res = await API.company.getDriveApplicants(route.params.id);
                data.value = res.data.data;
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        function startEdit(app) {
            editing.value = app.id;
            editForm.status = app.status;
            editForm.notes = app.notes || '';
            editForm.interview_date = app.interview_date ? app.interview_date.slice(0, 16) : '';
            editForm.interview_mode = app.interview_mode || '';
            editForm.interview_location = app.interview_location || '';
        }

        async function saveUpdate(app) {
            try {
                await API.company.updateApplication(app.id, {
                    status: editForm.status,
                    notes: editForm.notes,
                    interview_date: editForm.interview_date || null,
                    interview_mode: editForm.interview_mode || null,
                    interview_location: editForm.interview_location || null
                });
                Store.Toast.success('Application updated.');
                editing.value = null;
                load();
            } catch(e) { Store.handleApiError(e); }
        }

        onMounted(load);
        return { loading, data, statusFilter, editing, editForm,
                 filteredApps, startEdit, saveUpdate, formatDate, API };
    }
};