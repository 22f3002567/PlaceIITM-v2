window.StudentBrowseDrives = {
    name: 'StudentBrowseDrives',
    template: `
    <div>
        <h2>Browse Placement Drives</h2>
        <p>All currently open drives. Apply before the deadline.</p>

        <div>
            <input v-model="search"
                   placeholder="Search by company, role, skills or location"
                   size="50"
                   @keyup.enter="load" />
            <button @click="load">Search</button>
            <button @click="clearSearch">Clear</button>
        </div>
        <br>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else>
            <p>{{ drives.length }} drive(s) found</p>

            <div v-if="drives.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Company</th><th>Role</th><th>Type</th>
                            <th>Salary</th><th>Location</th><th>Min CGPA</th>
                            <th>Deadline</th><th>Applicants</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="drive in drives" :key="drive.id">
                            <td>{{ drive.company_name }}</td>
                            <td>
                                {{ drive.job_title }}<br>
                                <small v-if="drive.required_skills">Skills: {{ drive.required_skills }}</small>
                            </td>
                            <td>{{ drive.job_type || '-' }}</td>
                            <td>{{ drive.salary_range || '-' }}</td>
                            <td>{{ drive.location || '-' }}</td>
                            <td>{{ drive.min_cgpa || 'None' }}</td>
                            <td>
                                {{ drive.application_deadline }}
                                <br><small>({{ drive.days_left }} day(s) left)</small>
                            </td>
                            <td>{{ drive.total_applications }}</td>
                            <td>
                                <span v-if="appliedIds.has(drive.id)">✔ Applied</span>
                                <button v-else
                                    :disabled="applying === drive.id"
                                    @click="apply(drive)">
                                    {{ applying === drive.id ? 'Applying...' : 'Apply Now' }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else>No open drives found. {{ search ? 'Try a different search term.' : 'Check back later.' }}</p>
        </div>
    </div>
    `,
    setup() {
        const { ref, onMounted } = Vue;
        const loading = ref(true);
        const drives = ref([]);
        const appliedIds = ref(new Set());
        const search = ref('');
        const applying = ref(null);

        async function load() {
            loading.value = true;
            try {
                const [drivesRes, appsRes] = await Promise.all([
                    API.student.getDrives({ search: search.value }),
                    API.student.getApplications()
                ]);
                drives.value = drivesRes.data.data;
                const apps = appsRes.data.data.applications || [];
                appliedIds.value = new Set(apps.map(a => a.drive_id));
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        function clearSearch() { search.value = ''; load(); }

        async function apply(drive) {
            applying.value = drive.id;
            try {
                await API.student.applyToDrive(drive.id);
                appliedIds.value.add(drive.id);
                Store.Toast.success(`Applied to ${drive.job_title}!`);
                const d = drives.value.find(x => x.id === drive.id);
                if (d) d.total_applications += 1;
            } catch(e) { Store.handleApiError(e); }
            finally { applying.value = null; }
        }

        onMounted(load);
        return { loading, drives, appliedIds, search, applying, load, clearSearch, apply };
    }
};