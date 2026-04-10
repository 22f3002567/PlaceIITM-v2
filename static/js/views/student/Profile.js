window.StudentProfile = {
    name: 'StudentProfile',
    template: `
    <div>
        <h2>My Profile</h2>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else-if="student">

            <h3>Profile Summary</h3>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr><th>Full Name</th><td>{{ student.full_name }}</td></tr>
                <tr><th>Roll No</th><td>{{ student.roll_no || '-' }}</td></tr>
                <tr><th>Email</th><td>{{ student.email }}</td></tr>
                <tr><th>Department</th><td>{{ student.department || '-' }}</td></tr>
                <tr><th>Degree</th><td>{{ student.degree || '-' }}</td></tr>
                <tr><th>CGPA</th><td>{{ student.cgpa || '-' }}</td></tr>
                <tr><th>Profile Completeness</th><td>{{ student.profile_completeness }}%</td></tr>
                <tr>
                    <th>Resume</th>
                    <td>
                        <a v-if="student.resume_filename"
                           :href="API.resumeUrl(student.resume_filename)"
                           target="_blank">View Current Resume (PDF)</a>
                        <span v-else>No resume uploaded yet.</span>
                    </td>
                </tr>
            </table>

            <h3>Edit Profile</h3>
            <div>
                <label>Full Name *: </label>
                <input v-model="form.full_name" />
                <span v-if="errors.full_name" style="color:red"> {{ errors.full_name }}</span>
            </div>
            <div>
                <label>Phone: </label>
                <input v-model="form.phone" type="tel" placeholder="10-digit mobile number" />
            </div>
            <div>
                <label>Department: </label>
                <select v-model="form.department">
                    <option value="">-- Select --</option>
                    <option v-for="d in lookups.departments" :key="d">{{ d }}</option>
                </select>
            </div>
            <div>
                <label>Degree: </label>
                <select v-model="form.degree">
                    <option value="">- Select --</option>
                    <option v-for="d in lookups.degrees" :key="d">{{ d }}</option>
                </select>
            </div>
            <div>
                <label>Graduation Year: </label>
                <input v-model="form.graduation_year" type="number" placeholder="2026" min="2020" max="2035" />
            </div>
            <div>
                <label>CGPA: </label>
                <input v-model="form.cgpa" type="number" step="0.01" min="0" max="10" placeholder="e.g. 8.5" />
                <span v-if="errors.cgpa" style="color:red"> {{ errors.cgpa }}</span>
            </div>
            <div>
                <label>Skills (comma-separated): </label>
                <input v-model="form.skills" size="50" placeholder="e.g. Python, Machine Learning, SQL" />
            </div>
            <div>
                <label>Bio: </label><br>
                <textarea v-model="form.bio" rows="3" cols="50" placeholder="A short bio about yourself..."></textarea>
            </div>
            <br>
            <button @click="saveProfile" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>

            <hr>

            <h3>Upload Resume (PDF only, max 5MB)</h3>
            <div v-if="student.resume_filename">
                <p>Current file: <strong>{{ student.resume_filename }}</strong> - upload a new file to replace it.</p>
            </div>
            <div>
                <input type="file" ref="resumeInput" accept=".pdf" />
                <button @click="uploadResume" :disabled="uploadingResume">
                    {{ uploadingResume ? 'Uploading...' : 'Upload Resume' }}
                </button>
            </div>

            <hr>

            <h3>Export Application History as CSV</h3>
            <p>Downloads all your applications. Runs in background ;- you will get an email when ready.</p>

            <div v-if="exportJob">
                <div v-if="exportJob.status === 'pending' || exportJob.status === 'processing'">
                    <p> Generating your export... please wait.</p>
                </div>
                <div v-else-if="exportJob.status === 'done'">
                    <p>Export ready!
                        <a :href="API.exportUrl(exportJob.filename)" download>Download CSV →</a>
                    </p>
                </div>
                <div v-else-if="exportJob.status === 'failed'">
                    <p> Export failed. Please try again.</p>
                </div>
            </div>

            <button @click="triggerExport"
                :disabled="exporting || (exportJob && exportJob.status === 'processing')">
                {{ exporting ? 'Starting...' : 'Export as CSV' }}
            </button>
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
            full_name: '', phone: '', department: '', degree: '',
            graduation_year: '', cgpa: '', skills: '', bio: ''
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
                Object.keys(form).forEach(k => { form[k] = student.value[k] || ''; });
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        async function saveProfile() {
            // Clear old errors
            Object.keys(errors).forEach(k => delete errors[k]);

            if (!form.full_name.trim()) errors.full_name = 'Full name is required.';
            if (form.cgpa && (parseFloat(form.cgpa) < 0 || parseFloat(form.cgpa) > 10)) {
                errors.cgpa = 'CGPA must be between 0 and 10.';
            }
            if (Object.keys(errors).length) {
                Store.Toast.warning('Please fix the highlighted fields.');
                return;
            }

            saving.value = true;
            try {
                const res = await API.student.updateProfile(form);
                student.value = res.data.data;
                Store.Toast.success('Profile updated!');
            } catch(e) { Store.handleApiError(e); }
            finally { saving.value = false; }
        }

        async function uploadResume() {
            const file = resumeInput.value?.files[0];
            if (!file) return Store.Toast.warning('Please select a PDF file first.');
            if (!file.name.toLowerCase().endsWith('.pdf'))
                return Store.Toast.warning('Only PDF files are allowed.');

            const fd = new FormData();
            fd.append('resume', file);

            uploadingResume.value = true;
            try {
                const res = await API.student.uploadResume(fd);
                student.value.resume_filename = res.data.data.resume_filename;
                Store.Toast.success('Resume uploaded successfully!');
                if (resumeInput.value) resumeInput.value.value = '';
            } catch(e) { Store.handleApiError(e); }
            finally { uploadingResume.value = false; }
        }

        async function triggerExport() {
            exporting.value = true;
            try {
                const res = await API.student.triggerExport();
                exportJob.value = { id: res.data.data.job_id, status: 'pending' };
                Store.Toast.info('Export started! Check back here or your email.');
                startPolling(res.data.data.job_id);
            } catch(e) { Store.handleApiError(e); }
            finally { exporting.value = false; }
        }

        function startPolling(jobId) {
            if (pollInterval) clearInterval(pollInterval);
            pollInterval = setInterval(async () => {
                try {
                    const res = await API.student.exportStatus(jobId);
                    exportJob.value = res.data.data;
                    if (['done', 'failed'].includes(exportJob.value.status)) {
                        clearInterval(pollInterval);
                        if (exportJob.value.status === 'done')
                            Store.Toast.success('CSV export is ready! Download it above.');
                    }
                } catch(e) { clearInterval(pollInterval); }
            }, 3000);
        }

        onMounted(load);
        onUnmounted(() => { if (pollInterval) clearInterval(pollInterval); });

        return {
            loading, saving, uploadingResume, exporting,
            student, resumeInput, exportJob, lookups, form, errors,
            saveProfile, uploadResume, triggerExport, API
        };
    }
};