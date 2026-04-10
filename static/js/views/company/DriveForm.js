window.CompanyDriveForm = {
    name: 'CompanyDriveForm',
    template: `
    <div>
        <router-link to="/company/dashboard">← Back to Dashboard</router-link>

        <h2>{{ isEdit ? 'Edit Placement Drive' : 'Post a Placement Drive' }}</h2>
        <p v-if="isEdit">Saving changes will re-submit this drive for admin approval.</p>
        <p v-else>Fill in the details. Admin will review before students can apply.</p>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else>

            <h3>Job Details</h3>
            <div>
                <label>Job Title *: </label>
                <input v-model="form.job_title" placeholder="e.g. Software Development Engineer" size="40" />
                <span v-if="errors.job_title" style="color:red"> {{ errors.job_title }}</span>
            </div>
            <div>
                <label>Job Type: </label>
                <select v-model="form.job_type">
                    <option value="">-- Select --</option>
                    <option v-for="jt in jobTypes" :key="jt">{{ jt }}</option>
                </select>
            </div>
            <div>
                <label>Salary / CTC: </label>
                <input v-model="form.salary_range" placeholder="e.g. 12–18 LPA" />
            </div>
            <div>
                <label>Location: </label>
                <input v-model="form.location" placeholder="e.g. Bengaluru / Remote" />
            </div>
            <div>
                <label>Job Description *: </label><br>
                <textarea v-model="form.job_description" rows="5" cols="60"
                    placeholder="Describe the role and responsibilities..."></textarea>
                <span v-if="errors.job_description" style="color:red"><br>{{ errors.job_description }}</span>
            </div>

            <h3>Eligibility</h3>
            <div>
                <label>Minimum CGPA: </label>
                <input v-model="form.min_cgpa" type="number" step="0.1" min="0" max="10" placeholder="e.g. 7.0" />
                <small> (leave blank for no CGPA filter)</small>
            </div>
            <div>
                <label>Eligible Branches (comma-separated): </label>
                <input v-model="form.eligible_branches" size="50"
                    placeholder="e.g. Computer Science & Engineering, Data Science" />
                <small> (leave blank for all branches)</small>
            </div>
            <div>
                <label>Eligible Degrees (comma-separated): </label>
                <input v-model="form.eligible_degrees" placeholder="e.g. B.Tech, BS" />
                <small> (leave blank for all degrees)</small>
            </div>
            <div>
                <label>Required Skills (comma-separated): </label>
                <input v-model="form.required_skills" size="50" placeholder="e.g. Python, SQL, REST APIs" />
            </div>

            <h3>Application Deadline</h3>
            <div>
                <label>Deadline *: </label>
                <input v-model="form.application_deadline" type="date" :min="today" />
                <span v-if="errors.application_deadline" style="color:red"> {{ errors.application_deadline }}</span>
            </div>

            <br>
            <button @click="submit" :disabled="saving">
                {{ saving ? 'Submitting...' : (isEdit ? 'Save & Resubmit for Approval' : 'Submit for Approval') }}
            </button>
            <router-link to="/company/dashboard"> Cancel</router-link>
        </div>
    </div>
    `,
    setup() {
        const { ref, reactive, computed, onMounted } = Vue;
        const route = VueRouter.useRoute();
        const router = VueRouter.useRouter();

        const loading = ref(false);
        const saving = ref(false);
        const errors = reactive({});
        const isEdit = computed(() => !!route.params.id);
        const today = new Date().toISOString().split('T')[0];

        const jobTypes = ['Full Time','Part Time','Internship','Internship + PPO','Contract'];

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
                loading.value = true;
                try {
                    const res = await API.company.dashboard();
                    const drive = res.data.data.drives.find(d => d.id == route.params.id);
                    if (!drive) {
                        Store.Toast.error('Drive not found.');
                        return router.push('/company/dashboard');
                    }
                    if (drive.status !== 'pending' && drive.status !== 'rejected') {
                        Store.Toast.warning('Only pending or rejected drives can be edited.');
                        return router.push('/company/dashboard');
                    }
                    Object.keys(form).forEach(k => { form[k] = drive[k] !== null && drive[k] !== undefined ? drive[k] : ''; });
                } catch(e) {
                    Store.handleApiError(e);
                    router.push('/company/dashboard');
                } finally { loading.value = false; }
            }
        });

        async function submit() {
            // Clear previous errors
            Object.keys(errors).forEach(k => delete errors[k]);

            // Validate
            if (!form.job_title.trim()) errors.job_title = 'Job title is required.';
            if (!form.job_description.trim()) errors.job_description = 'Job description is required.';
            if (!form.application_deadline) errors.application_deadline = 'Deadline is required.';
            else if (form.application_deadline < today) errors.application_deadline = 'Deadline must be a future date.';

            if (Object.keys(errors).length) {
                Store.Toast.warning('Please fix the highlighted fields.');
                return;
            }

            saving.value = true;
            try {
                if (isEdit.value) {
                    await API.company.editDrive(route.params.id, form);
                    Store.Toast.success('Drive updated and re-submitted!');
                } else {
                    await API.company.createDrive(form);
                    Store.Toast.success('Drive submitted for admin approval!');
                }
                router.push('/company/dashboard');
            } catch(e) { Store.handleApiError(e); }
            finally { saving.value = false; }
        }

        return { loading, saving, isEdit, today, jobTypes, form, errors, submit };
    }
};