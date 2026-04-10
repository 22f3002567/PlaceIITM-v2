window.CompanyDashboard = {
    name: 'CompanyDashboard',
    template: `
    <div>
        <div v-if="loading"><p>Loading...</p></div>
        <div v-else-if="data">

            <h2>Company Dashboard ;- {{ data.company.company_name }}</h2>
            <router-link to="/company/drives/new">+ Post New Drive</router-link>

            <div v-if="data.company.approval_status === 'pending'">
                <p><strong>Pending Approval :-</strong> Your company is under review. You cannot post drives until approved.</p>
            </div>
            <div v-else-if="data.company.approval_status === 'rejected'">
                <p><strong>Registration Rejected :-</strong> Contact the Placement Cell.</p>
            </div>

            <h3>Stats</h3>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr>
                    <th>Total Drives</th><th>Active Drives</th>
                    <th>Total Applicants</th><th>Total Selected</th>
                </tr>
                <tr>
                    <td>{{ data.stats.total_drives }}</td>
                    <td>{{ data.stats.active_drives }}</td>
                    <td>{{ data.stats.total_apps }}</td>
                    <td>{{ data.stats.total_selected }}</td>
                </tr>
            </table>

            <h3>My Placement Drives</h3>
            <div v-if="data.drives.length">
                <table border="1" cellpadding="8" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Job Title</th><th>Type</th><th>Salary</th>
                            <th>Deadline</th><th>Applicants</th><th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="drive in data.drives" :key="drive.id">
                            <td>{{ drive.job_title }}<br><small>{{ drive.location || '' }}</small></td>
                            <td>{{ drive.job_type || '-' }}</td>
                            <td>{{ drive.salary_range || '-' }}</td>
                            <td>{{ drive.application_deadline || '-' }}</td>
                            <td>
                                <router-link :to="'/company/drives/' + drive.id + '/applicants'">
                                    {{ drive.total_applications }}
                                </router-link>
                            </td>
                            <td>{{ drive.status }}</td>
                            <td>
                                <router-link :to="'/company/drives/' + drive.id + '/applicants'">Applicants</router-link>
                                |
                                <router-link v-if="drive.status === 'pending' || drive.status === 'rejected'"
                                    :to="'/company/drives/' + drive.id + '/edit'">Edit</router-link>
                                <button v-if="drive.status === 'approved'" @click="closeDrive(drive)">Close</button>
                                <button v-if="drive.status !== 'approved'" @click="confirmDelete(drive)">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else>No drives posted yet. <router-link to="/company/drives/new">Post your first drive</router-link></p>
        </div>

        <div v-if="deleteTarget">
            <p><strong>Delete "{{ deleteTarget.job_title }}"?</strong> This cannot be undone.</p>
            <button @click="doDelete">Yes, Delete</button>
            <button @click="deleteTarget = null">Cancel</button>
        </div>
    </div>
    `,

    
    setup() {
        const { ref, onMounted } = Vue;
        const loading = ref(true);
        const data = ref(null);
        const deleteTarget = ref(null);

        async function load() {
            loading.value = true;
            try {
                const res = await API.company.dashboard();
                data.value = res.data.data;
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        async function closeDrive(drive) {
            try { await API.company.closeDrive(drive.id); Store.Toast.info(`"${drive.job_title}" closed.`); load(); }
            catch(e) { Store.handleApiError(e); }
        }

        function confirmDelete(drive) { deleteTarget.value = drive; }

        async function doDelete() {
            try {
                await API.company.deleteDrive(deleteTarget.value.id);
                Store.Toast.success(`"${deleteTarget.value.job_title}" deleted.`);
                deleteTarget.value = null;
                load();
            } catch(e) { Store.handleApiError(e); }
        }

        onMounted(load);
        return { loading, data, deleteTarget, closeDrive, confirmDelete, doDelete };
    }
};