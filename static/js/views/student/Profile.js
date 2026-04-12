// student/Profile.js


window.StudentProfile = {
    name: 'StudentProfile',


    template: `
    <div class="container py-4">
        <div class="ppa-page-header">
            <h2>My Profile</h2>
            <p>Keep your profile complete for better placement chances.</p>
        </div>

        <app-spinner v-if="loading" />
        <div v-else-if="student" class="row g-4">

            <!-- Left: Profile summary card -->
            <div class="col-md-4">
                <div class="ppa-card mb-3">
                    <div class="card-body p-4 text-center">
                        <!-- Avatar: first letter -->
                        <div class="ppa-company-avatar mx-auto mb-3"
                             style="width:64px; height:64px; font-size:1.6rem; border-radius:50%; background:#dbeafe; color:#1e40af;">
                            {{ student.stu_name[0].toUpperCase() }}
                        </div>
                        <h5 class="fw-700 mb-1">{{ student.stu_name }}</h5>
                        <p class="text-muted small mb-1">{{ student.roll_no || 'Roll no. not set' }}</p>
                        <p class="text-muted small mb-3">
                            {{ student.department || '' }}
                            <span v-if="student.department && student.degree"> -- </span>
                            {{ student.degree || '' }}
                        </p>


                        <!-- Completeness bar -->
                        <div class="d-flex justify-content-between small mb-1">
                            <span class="fw-600">Profile Completeness</span>
                            <span class="text-muted">{{ student.profile_completeness }}%</span>
                        </div>
                        <div class="ppa-progress mb-3">
                            <div class="ppa-progress-bar"
                                 :style="{
                                     width: student.profile_completeness + '%',
                                     background: student.profile_completeness < 50 ? '#dc2626'
                                               : student.profile_completeness < 80 ? '#d97706'
                                               : '#059669'
                                 }"></div>
                        </div>



                        <!-- Resume link -->
                        <div v-if="student.resume_filename">
                            <a :href="API.resumeUrl(student.resume_filename)"
                               target="_blank" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-file-pdf me-1"></i>View Resume
                            </a>
                        </div>
                        <p v-else class="text-muted small mb-0">No resume uploaded yet.</p>
                    </div>
                </div>



                <!-- Export CSV card -->
                <div class="ppa-card">
                    <div class="card-body p-3">
                        <h6 class="fw-600 mb-2">Export Application History</h6>
                        <p class="text-muted small mb-3">
                            Download a CSV of all your applications. Processed in the background :-
                            you will receive an email when it is ready.
                        </p>


                        <!-- Export states -->
                        <div v-if="exportJob">
                            <div v-if="exportJob.status === 'pending' || exportJob.status === 'processing'"
                                 class="alert alert-info small py-2 mb-2">
                                <span class="spinner-border spinner-border-sm me-2"></span>
                                Generating your export... please wait.
                            </div>
                            <div v-else-if="exportJob.status === 'done'"
                                 class="alert alert-success small py-2 mb-2">
                                <i class="bi bi-check-circle me-1"></i>
                                Export ready!
                                <a :href="API.exportUrl(exportJob.filename)" class="alert-link ms-1" download>
                                    Download CSV →
                                </a>
                            </div>
                            <div v-else-if="exportJob.status === 'failed'"
                                 class="alert alert-danger small py-2 mb-2">
                                <i class="bi bi-x-circle me-1"></i>Export failed. Please try again.
                            </div>
                        </div>



                        <button class="btn btn-sm btn-outline-secondary w-100"
                                @click="triggerExport"
                                :disabled="exporting || (exportJob && exportJob.status === 'processing')">
                            <i class="bi bi-download me-1"></i>
                            {{ exporting ? 'Starting...' : 'Export as CSV' }}
                        </button>
                    </div>
                </div>
            </div>



            <!-- Right: Edit form -->
            <div class="col-md-8">
                <div class="ppa-card">
                    <div class="card-body p-4">
                        <h5 class="fw-600 mb-4">Edit Profile</h5>



                        <!-- Personal information -->
                        <div class="form-section-title">Personal Information</div>
                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label">Full Name</label>
                                <input v-model="form.stu_name" class="form-control"
                                   :class="errors.stu_name ? 'is-invalid' : ''"
                                   @input="errors.stu_name = ''">
                        <div v-if="errors.stu_name" class="field-error">
                            <i class="bi bi-exclamation-circle-fill"></i>{{ errors.stu_name }}
                        </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Phone</label>
                                <input v-model="form.phone" type="tel" class="form-control"
                                       placeholder="10-digit mobile number">
                            </div>
                            <div class="col-md-5">
                                <label class="form-label">Department</label>
                                <select v-model="form.department" class="form-select">
                                    <option value="">= Select =</option>
                                    <option v-for="d in lookups.departments" :key="d">{{ d }}</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Degree</label>
                                <select v-model="form.degree" class="form-select">
                                    <option value="">- Select -</option>
                                    <option v-for="d in lookups.degrees" :key="d">{{ d }}</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Graduation Year</label>
                                <input v-model="form.graduation_year" type="number" class="form-control"
                                       placeholder="2026" min="2020" max="2035">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">CGPA</label>
                                <input v-model="form.cgpa" type="number" class="form-control"
                                       placeholder="8.5" step="0.01" min="0" max="10">
                            </div>
                            <div class="col-md-9">
                                <label class="form-label">
                                    Skills <small class="text-muted fw-400">(comma-separated)</small>
                                </label>
                                <input v-model="form.skills" class="form-control"
                                       placeholder="e.g. Python, Machine Learning, SQL">
                            </div>
                            <div class="col-12">
                                <label class="form-label">Bio</label>
                                <textarea v-model="form.bio" class="form-control" rows="3"
                                          placeholder="A short bio about yourself..."></textarea>
                            </div>
                        </div>


                        <button class="btn btn-primary mb-4" @click="saveProfile" :disabled="saving">
                            <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                            <i v-else class="bi bi-save me-1"></i>
                            {{ saving ? 'Saving...' : 'Save Changes' }}
                        </button>

                        <hr class="mb-4">



                        <!-- Resume upload -->
                        <div class="form-section-title">
                            Resume Upload <small class="text-muted fw-400">(PDF only, max 5 MB)</small>
                        </div>
                        <div v-if="student.resume_filename"
                             class="alert alert-light border small mb-3 py-2">
                            <i class="bi bi-file-pdf text-danger me-2"></i>
                            Current: <strong>{{ student.resume_filename }}</strong>
                            :- upload a new file to replace it.
                        </div>
                        <div class="d-flex gap-2 align-items-center">
                            <input type="file" ref="resumeInput" class="form-control"
                                   accept=".pdf" style="max-width:360px;">
                            <button class="btn btn-outline-primary" @click="uploadResume"
                                    :disabled="uploadingResume">
                                <span v-if="uploadingResume" class="spinner-border spinner-border-sm me-1"></span>
                                <i v-else class="bi bi-cloud-upload me-1"></i>
                                {{ uploadingResume ? 'Uploading...' : 'Upload' }}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    setup() {
        const { ref, reactive, onMounted, onUnmounted } = Vue;
        const loading = ref(true);
        const saving = ref(false);
        const uploadingResume = ref(false);
        const exporting = ref(false);
        const student = ref(null);
        const resumeInput = ref(null);
        const exportJob = ref(null);
        const errors = reactive({});
        let pollInterval = null;

        const lookups = reactive({ departments: [], degrees: [] });

        const form = reactive({
            stu_name: '', 
            phone: '', 
            department: '', 
            degree: '',
            graduation_year: '', 
            cgpa: '', 
            skills: '', 
            bio: ''
        });

        async function load() {
            loading.value = true;
            try {
                const [profileRes, lookupsRes] = await Promise.all([
                    API.student.getProfile(),
                    API.student.lookups()
                ]);
                student.value = profileRes.data.data;
                Object.assign(lookups, lookupsRes.data.data);
                // Populateing form
                Object.keys(form).forEach(k => { form[k] = student.value[k] || ''; });
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                loading.value = false;
            }
        }

        async function saveProfile() {
            const vErrors = validate(form, {
                stu_name: [Rules.required('Full name is required.')],
                cgpa:      form.cgpa ? [Rules.minNum(0, 'CGPA must be between 0 and 10.'), Rules.maxNum(10, 'CGPA must be between 0 and 10.')] : []
            });
            Object.assign(errors, vErrors);
            if (Object.keys(vErrors).length) {
                Store.Toast.warning('Please fix the highlighted fields.');
                return;
            }
            saving.value = true;
            try {
                const res = await API.student.updateProfile(form);
                student.value = res.data.data;
                Store.Toast.success('Profile updated successfully!');
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                saving.value = false;
            }
        }

        async function uploadResume() {
            const file = resumeInput.value?.files[0];
            if (!file) return Store.Toast.warning('Please select a PDF file first.');
            if (!file.name.endsWith('.pdf')) return Store.Toast.warning('Only PDF files are allowed.');

            const fd = new FormData();
            fd.append('resume', file);

            uploadingResume.value = true;
            try {
                const res = await API.student.uploadResume(fd);
                student.value.resume_filename = res.data.data.resume_filename;
                Store.Toast.success('Resume uploaded successfully!');
                if (resumeInput.value) resumeInput.value.value = '';
            } catch(e) {
                Store.handleApiError(e, 'Resume upload failed.');
            } finally {
                uploadingResume.value = false;
            }
        }

        async function triggerExport() {
            exporting.value = true;
            try {
                const res = await API.student.triggerExport();
                exportJob.value = { id: res.data.data.job_id, status: 'pending' };
                Store.Toast.info('Export started! We will email you when it is ready.');
                startPolling(res.data.data.job_id);
            } catch(e) {
                Store.handleApiError(e, 'Could not start export.');
            } finally {
                exporting.value = false;
            }
        }

        function startPolling(jobId) {


            // Poll every 3 seconds until done or failed
            if (pollInterval) clearInterval(pollInterval);
            pollInterval = setInterval(async () => {
                try {
                    const res = await API.student.exportStatus(jobId);
                    exportJob.value = res.data.data;
                    if (['done', 'failed'].includes(exportJob.value.status)) {
                        clearInterval(pollInterval);
                        if (exportJob.value.status === 'done') {
                            Store.Toast.success('Your CSV export is ready! Check the download link.');
                        }
                    }
                } catch(e) {
                    clearInterval(pollInterval);
                }
            }, 3000);
        }

        onMounted(load);

        // Clean up interval on unmount
        onUnmounted(() => { if (pollInterval) clearInterval(pollInterval); });

        return {
            loading, saving, uploadingResume, exporting,
            student, resumeInput, exportJob, lookups, form, errors,
            saveProfile, uploadResume, triggerExport, API
        };
    }

};
