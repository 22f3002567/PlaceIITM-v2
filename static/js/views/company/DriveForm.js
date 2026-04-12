// company/DriveForm.js ;- Create NEW drive OR Edit existing drive.
// The same component handles both. Mode detected by route.id param.


window.CompanyDriveForm = {

    name: 'CompanyDriveForm',

    template: `
    <div class="container py-4">
        <div class="mb-3">
            <router-link to="/company/dashboard" class="text-muted text-decoration-none small">
                <i class="bi bi-arrow-left me-1"></i>Back to Dashboard
            </router-link>
        </div>

        <div class="ppa-page-header">
            <h2>{{ isEdit ? 'Edit Placement Drive' : 'Post a Placement Drive' }}</h2>
            <p v-if="isEdit">
                Changes will re-submit this drive for admin approval.
            </p>
            <p v-else>
                Fill in the details below. The drive will be reviewed by admin before students can apply.
            </p>
        </div>

        <div v-if="isEdit" class="alert alert-info small mb-4">
            <i class="bi bi-info-circle me-1"></i>
            Saving changes will re-submit this drive for admin approval.
            It will be unavailable to students until approved again.
        </div>

        <app-spinner v-if="loading" />
        <div v-else class="row justify-content-center">
            <div class="col-md-9">
                <div class="ppa-card">
                    <div class="card-body p-4">



                        <!-- Section: Job Details -->

                        <div class="form-section-title">Job Details</div>
                        <div class="row g-3 mb-4">
                            <div class="col-md-8">
                                <label class="form-label">Job Title *</label>
                                <input v-model="form.job_title" class="form-control"
                                       :class="errors.job_title ? 'is-invalid' : ''"
                                       placeholder="e.g. Software Development Engineer"
                                       @input="errors.job_title = ''">
                                <div v-if="errors.job_title" class="field-error">
                                    <i class="bi bi-exclamation-circle-fill"></i>{{ errors.job_title }}
                                </div>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Job Type</label>
                                <select v-model="form.job_type" class="form-select">
                                    <option value="">-- Select --</option>
                                    <option v-for="jt in jobTypes" :key="jt">{{ jt }}</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Salary / CTC</label>
                                <input v-model="form.salary_range" class="form-control"
                                       placeholder="e.g. 12–18 LPA">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Location</label>
                                <input v-model="form.location" class="form-control"
                                       placeholder="e.g. Bengaluru / Remote">
                            </div>
                            <div class="col-12">
                                <label class="form-label">Job Description *</label>
                                <textarea v-model="form.job_description" class="form-control" rows="5"
                                          :class="errors.job_description ? 'is-invalid' : ''"
                                          placeholder="Describe the role, responsibilities and what the day-to-day work looks like..."
                                          @input="errors.job_description = ''"></textarea>
                                <div v-if="errors.job_description" class="field-error">
                                    <i class="bi bi-exclamation-circle-fill"></i>{{ errors.job_description }}
                                </div>
                            </div>
                        </div>

                        <hr class="mb-4">



                        <!-- Section: Eligibility -->


                        <div class="form-section-title">Eligibility & Requirements</div>
                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <label class="form-label">Minimum CGPA</label>
                                <input v-model="form.min_cgpa" type="number" class="form-control"
                                       placeholder="e.g. 7.0" step="0.1" min="0" max="10">
                                <div class="form-text">Leave blank for no CGPA filter.</div>
                            </div>
                            <div class="col-md-8">
                                <label class="form-label">
                                    Eligible Branches
                                    <small class="text-muted fw-400">(comma-separated, leave blank for all)</small>
                                </label>
                                <input v-model="form.eligible_branches" class="form-control"
                                       placeholder="e.g. Computer Science & Engineering, Data Science">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">
                                    Eligible Degrees
                                    <small class="text-muted fw-400">(comma-separated, leave blank for all)</small>
                                </label>
                                <input v-model="form.eligible_degrees" class="form-control"
                                       placeholder="e.g. B.Tech, BS">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">
                                    Required Skills
                                    <small class="text-muted fw-400">(comma-separated)</small>
                                </label>
                                <input v-model="form.required_skills" class="form-control"
                                       placeholder="e.g. Python, Django, REST APIs, SQL">
                            </div>
                        </div>

                        <hr class="mb-4">



                        <!-- Section: Deadline -->

                        <div class="form-section-title">Application Deadline</div>
                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <label class="form-label">Deadline *</label>
                                <input v-model="form.application_deadline" type="date"
                                       class="form-control" :min="today"
                                       :class="errors.application_deadline ? 'is-invalid' : ''"
                                       @change="errors.application_deadline = ''">
                                <div v-if="errors.application_deadline" class="field-error">
                                    <i class="bi bi-exclamation-circle-fill"></i>{{ errors.application_deadline }}
                                </div>
                            </div>
                        </div>

                        <div class="d-flex gap-2">
                            <button class="btn btn-primary" @click="submit" :disabled="saving">
                                <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                                <i v-else class="bi bi-send me-1"></i>
                                {{ saving ? 'Submitting...' : (isEdit ? 'Save & Resubmit for Approval' : 'Submit for Approval') }}
                            </button>
                            <router-link to="/company/dashboard" class="btn btn-outline-secondary">
                                Cancel
                            </router-link>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    setup() {
        const { ref, reactive, computed, onMounted } = Vue;
        const route  = VueRouter.useRoute();
        const router = VueRouter.useRouter();

        const loading = ref(false);
        const saving = ref(false);
        const errors = reactive({});
        const isEdit = computed(() => !!route.params.id);
        const today = new Date().toISOString().split('T')[0];

        const jobTypes = ['Full Time', 'Part Time', 'Internship', 'Internship + PPO', 'Contract'];

        const form = reactive({
            job_title: '',
            job_type: '',
            salary_range: '',
            location: '',
            job_description: '',
            min_cgpa: '',
            eligible_branches: '',
            eligible_degrees: '',
            required_skills: '',
            application_deadline: ''
        });

        onMounted(async () => {
            if (isEdit.value) {
                // Load existing drive data for editing
                loading.value = true;
                try {
                    // Dashboard returns all drives; find the one we need
                    const res = await API.company.dashboard();
                    const drive = res.data.data.drives.find(d => d.id == route.params.id);
                    if (!drive) {
                        Store.Toast.error('Drive not found.');
                        router.push('/company/dashboard');
                        return;
                    }
                    if (drive.status !== 'pending' && drive.status !== 'rejected') {
                        Store.Toast.warning('Only pending or rejected drives can be edited.');
                        router.push('/company/dashboard');
                        return;
                    }
                    // Populate form
                    Object.keys(form).forEach(k => {
                        form[k] = drive[k] !== null && drive[k] !== undefined ? drive[k] : '';
                    });
                } catch(e) {
                    Store.handleApiError(e);
                    router.push('/company/dashboard');
                } finally {
                    loading.value = false;
                }
            }
        });

        async function submit() {
            // Frontend validation using Rules helper
            const validationErrors = validate(form, {
                job_title: [Rules.required('Job title is required.')],
                job_description: [Rules.required('Job description is required.')],
                application_deadline: [
                    Rules.required('Deadline is required.'),
                    Rules.futureDate('Deadline must be a future date.')
                ]
            });
            Object.assign(errors, validationErrors);
            if (Object.keys(validationErrors).length) {
                Store.Toast.warning('Please fix the highlighted fields.');
                return;
            }

            saving.value = true;
            try {
                if (isEdit.value) {
                    await API.company.editDrive(route.params.id, form);
                    Store.Toast.success('Drive updated and re-submitted for approval!');
                } else {
                    await API.company.createDrive(form);
                    Store.Toast.success('Drive submitted for admin approval!');
                }
                router.push('/company/dashboard');
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                saving.value = false;
            }
        }

        return { loading, saving, isEdit, today, jobTypes, form, errors, submit };
    }
};
