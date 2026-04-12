// company/DriveApplicants.js

window.CompanyDriveApplicants = {
    name: 'CompanyDriveApplicants',

    template: `
    <div class="container py-4">
        <div class="mb-3">
            <router-link to="/company/dashboard" class="text-muted text-decoration-none small">
                <i class="bi bi-arrow-left me-1"></i>Back to Dashboard
            </router-link>
        </div>



        <app-spinner v-if="loading" />
        <template v-else-if="data">

            <div class="ppa-page-header d-flex justify-content-between align-items-start">
                <div>
                    <h2>{{ data.drive.job_title }}</h2>
                    <p>
                        {{ data.drive.job_type || '' }}
                        <span v-if="data.drive.location"> · {{ data.drive.location }}</span>
                        <span v-if="data.drive.application_deadline">
                            · Deadline: {{ formatDate(data.drive.application_deadline) }}
                        </span>
                    </p>
                </div>
                <status-badge :status="data.drive.status" />
            </div>




            <!-- Stats strip -->

            <div class="row g-3 mb-4">
                <div class="col-6 col-md-3" v-for="stat in applicantStats" :key="stat.label">
                    <div class="ppa-stat-card text-center py-3">
                        <div class="stat-value" :style="{color: stat.color}">{{ stat.value }}</div>
                        <div class="stat-label">{{ stat.label }}</div>
                    </div>
                </div>
            </div>



            <!-- Filter by status -->

            <div class="ppa-card mb-4">
                <div class="card-body p-3">
                    <div class="d-flex gap-2 flex-wrap align-items-center">
                        <span class="text-muted small fw-600 me-1">Filter:</span>
                        <button
                            v-for="s in ['', ...data.app_statuses]" :key="s"
                            class="btn btn-sm"
                            :class="statusFilter === s ? 'btn-primary' : 'btn-outline-secondary'"
                            @click="statusFilter = s">
                            {{ s || 'All' }}
                        </button>
                    </div>
                </div>
            </div>




            <!-- Applicants table -->

            <div class="ppa-card">
                <div class="card-body p-0">
                    <div v-if="filteredApps.length" class="table-responsive">
                        <table class="table ppa-table mb-0">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Roll No</th>
                                    <th>Dept / Degree</th>
                                    <th>CGPA</th>
                                    <th>Skills</th>
                                    <th>Resume</th>
                                    <th>Applied</th>
                                    <th>Status</th>
                                    <th>Update</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="app in filteredApps" :key="app.id">
                                    <td class="fw-600">{{ app.student_name }}</td>
                                    <td class="text-muted small">{{ app.roll_no || '-' }}</td>
                                    <td class="text-muted small">
                                        {{ app.department || '-' }}
                                        <div>{{ app.degree || '' }}</div>
                                    </td>
                                    <td>{{ app.cgpa || '-' }}</td>
                                    <td class="text-muted small" style="max-width:150px;">
                                        {{ app.skills || '-' }}
                                    </td>
                                    <td>
                                        <a v-if="app.resume_filename"
                                           :href="API.resumeUrl(app.resume_filename)"
                                           target="_blank"
                                           class="btn btn-sm btn-outline-primary">
                                            <i class="bi bi-file-pdf me-1"></i>PDF
                                        </a>
                                        <span v-else class="text-muted small">None</span>
                                    </td>
                                    <td class="text-muted small">{{ formatDate(app.applied_at) }}</td>
                                    <td><status-badge :status="app.status" /></td>
                                    <td>


                                        <!-- Inline update form per applicant -->


                                        <div v-if="editing === app.id">
                                            <div class="mb-2">
                                                <select v-model="editForm.status" class="form-select form-select-sm"
                                                        style="min-width:130px;">
                                                    <option v-for="s in data.app_statuses" :key="s">{{ s }}</option>
                                                </select>
                                            </div>
                                            <div class="mb-2">
                                                <input v-model="editForm.notes" class="form-control form-control-sm"
                                                       placeholder="Notes / feedback...">
                                            </div>
                                            <!-- Interview scheduling (shown when status = Interview) -->
                                            <template v-if="editForm.status === 'Interview'">
                                                <div class="mb-1">
                                                    <input v-model="editForm.interview_date" type="datetime-local"
                                                           class="form-control form-control-sm mb-1">
                                                    <input v-model="editForm.interview_mode" class="form-control form-control-sm mb-1"
                                                           placeholder="Online / Offline">
                                                    <input v-model="editForm.interview_location" class="form-control form-control-sm"
                                                           placeholder="Location / meeting link">
                                                </div>
                                            </template>
                                            <div class="d-flex gap-1">
                                                <button class="btn btn-sm btn-primary" @click="saveUpdate(app)">Save</button>
                                                <button class="btn btn-sm btn-outline-secondary" @click="editing=null">Cancel</button>
                                            </div>
                                        </div>
                                        <button v-else class="btn btn-sm btn-outline-secondary"
                                                @click="startEdit(app)">
                                            <i class="bi bi-pencil me-1"></i>Update
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <app-empty v-else
                        icon="bi bi-people"
                        message="No applicants match this filter."
                        :subtext="statusFilter ? 'Try clearing the status filter.' : 'No one has applied yet.'" />
                </div>
            </div>
        </template>
    </div>
    `,


    setup() {
        const { ref, reactive, computed, onMounted } = Vue;
        const route = VueRouter.useRoute();
        const loading = ref(true);
        const data = ref(null);

        const statusFilter = ref('');
        const editing = ref(null);   // app.id being edited
        const editForm = reactive({
            status: '', notes: '',
            interview_date: '', interview_mode: '', interview_location: ''
        });

        const filteredApps = computed(() => {
            if (!data.value) return [];
            if (!statusFilter.value) return data.value.applications;
            return data.value.applications.filter(a => a.status === statusFilter.value);
        });

        const applicantStats = computed(() => {
            if (!data.value) return [];
            const apps = data.value.applications;
            return [
                { label: 'Total Applied', value: apps.length,
                  color: '#1a56db' },

                { label: 'Shortlisted', value: apps.filter(a => a.status === 'Shortlisted').length,
                  color: '#d97706' },

                { label: 'Interview', value: apps.filter(a => a.status === 'Interview').length,
                  color: '#7c3aed' },

                { label: 'Selected', value: apps.filter(a => a.status === 'Selected').length,
                  color: '#059669' }
            ];
        });


        async function load() {
            loading.value = true;
            try {
                const res = await API.company.getDriveApplicants(route.params.id);
                data.value = res.data.data;

            } catch(e) {
                Store.handleApiError(e);

            } finally {
                loading.value = false;
            }
        }

        function startEdit(app) {
            editing.value = app.id;
            editForm.status = app.status;
            editForm.notes = app.notes || '';
            editForm.interview_date = app.interview_date ? app.interview_date.slice(0,16) : '';
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

                Store.Toast.success('Application updated successfully.');
                editing.value = null;
                load();
            } catch(e) {
                Store.handleApiError(e);
            }
        }

        onMounted(load);
        return {
            loading,
            data, 
            statusFilter, 
            editing, 
            editForm,
            filteredApps, 
            applicantStats,
            startEdit, 
            saveUpdate, 
            formatDate, 
            API
        };
    }
};
