// company/Dashboard.js


window.CompanyDashboard = {

    name: 'CompanyDashboard',

    template: `
    <div class="container py-4">
        <app-spinner v-if="loading" />
        <template v-else-if="data">

            <div class="ppa-page-header d-flex justify-content-between align-items-start">
                <div>
                    <h2>Company Dashboard</h2>
                    <p>Welcome back, {{ data.company.company_name }}</p>
                </div>
                <router-link to="/company/drives/new" class="btn btn-primary">
                    <i class="bi bi-plus-circle me-1"></i>Post New Drive
                </router-link>
            </div>




            <!-- Approval alerts -->
            
            <div v-if="data.company.approval_status === 'pending'"
                 class="alert alert-warning d-flex align-items-center gap-2 mb-4">
                <i class="bi bi-clock-fill"></i>
                <div>
                    <strong>Pending Approval :-</strong>
                    Your company registration is under review by the Placement Cell.
                    You cannot post drives until approved.
                </div>
            </div>
            <div v-else-if="data.company.approval_status === 'rejected'"
                 class="alert alert-danger d-flex align-items-center gap-2 mb-4">
                <i class="bi bi-x-circle-fill"></i>
                <div>
                    <strong>Registration Rejected :-</strong>
                    Please contact the Placement Cell for more information.
                </div>
            </div>




            <!-- Stat cards -->

            <div class="row g-3 mb-4">
                <div class="col-6 col-md-3" v-for="stat in statCards" :key="stat.label">
                    <div class="ppa-stat-card d-flex justify-content-between align-items-center">
                        <div>
                            <div class="stat-value">{{ data.stats[stat.key] }}</div>
                            <div class="stat-label">{{ stat.label }}</div>
                        </div>
                        <i :class="stat.icon + ' stat-icon'" :style="{color: stat.color}"></i>
                    </div>
                </div>
            </div>




            <!-- Applicants per drive chart -->

            <div v-if="data.drives.length" class="ppa-card mb-4">
                <div class="card-body p-4">
                    <h5 class="fw-600 mb-3">Applicants per Drive</h5>
                    <canvas id="companyDrivesChart" height="90"></canvas>
                </div>
            </div>



            <!-- My Drives table -->

            <div class="ppa-card">
                <div class="card-body p-0">
                    <div class="p-4 pb-0 d-flex justify-content-between align-items-center">
                        <h5 class="fw-600 mb-0">My Placement Drives</h5>
                        <router-link to="/company/drives/new" class="btn btn-sm btn-primary">
                            <i class="bi bi-plus me-1"></i>Post Drive
                        </router-link>
                    </div>

                    <!-- added -->
                    <!-- Legend explaining button rules -->
                    <!-- <div class="px-4 pt-3">
                        <small class="text-muted">
                            <i class="bi bi-info-circle me-1"></i>
                            <strong>Approved</strong> drives can be <strong>Closed</strong> or you can view <strong>Applicants</strong>.
                            <strong>Pending / Rejected</strong> drives can be <strong>Edited</strong> or <strong>Deleted</strong>.
                            <strong>Closed</strong> drives can be <strong>Deleted</strong>.
                        </small>
                    </div> -->



                    <div v-if="data.drives.length" class="table-responsive mt-3">
                        <table class="table ppa-table mb-0">
                            <thead>
                                <tr>
                                    <th>Job Title</th>
                                    <th>Type</th>
                                    <th>Salary</th>
                                    <th>Deadline</th>
                                    <th>Applicants</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="drive in data.drives" :key="drive.id">
                                    <td>
                                        <div class="fw-600">{{ drive.job_title }}</div>
                                        <div class="text-muted small">{{ drive.location || '' }}</div>
                                    </td>
                                    <td class="text-muted small">{{ drive.job_type || '-' }}</td>
                                    <td class="text-muted small">{{ drive.salary_range || '-' }}</td>
                                    <td class="small" :class="daysLeftClass(drive.days_left)">
                                        <template v-if="drive.application_deadline">
                                            {{ formatDate(drive.application_deadline) }}
                                            <div class="small">{{ daysLeftDisplay(drive.days_left) }}</div>
                                        </template>
                                        <template v-else>--</template>
                                    </td>
                                    <td class="text-center">
                                        <router-link :to="'/company/drives/' + drive.id + '/applicants'"
                                                     class="text-primary fw-600">
                                            {{ drive.total_applications }}
                                        </router-link>
                                    </td>
                                    <td><status-badge :status="drive.status" /></td>
                                    <td>
                                        <div class="d-flex gap-1 flex-wrap">
                                            <router-link
                                                :to="'/company/drives/' + drive.id + '/applicants'"
                                                class="btn btn-sm btn-outline-primary">
                                                Applicants
                                            </router-link>
                                            <router-link
                                                v-if="drive.status === 'pending' || drive.status === 'rejected'"
                                                :to="'/company/drives/' + drive.id + '/edit'"
                                                class="btn btn-sm btn-outline-secondary">
                                                
                                                Edit
                                            </router-link>
                                            <button
                                                v-if="drive.status === 'approved'"
                                                class="btn btn-sm btn-outline-secondary"
                                                @click="confirmClose(drive)">
                                               
                                                Close
                                            </button>
                                            <button
                                                v-if="drive.status !== 'approved'"
                                                class="btn btn-sm btn-outline-danger"
                                                @click="confirmDelete(drive)">
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <app-empty v-else
                        icon="bi bi-briefcase"
                        message="No drives posted yet."
                        subtext="Post your first placement drive to start receiving applications.">
                        <router-link to="/company/drives/new" class="btn btn-sm btn-primary mt-2">
                            Post First Drive
                        </router-link>
                    </app-empty>
                </div>
            </div>
        </template>


        <!-- Confirm Close Modal -->
        <confirm-modal
            v-if="closeTarget"
            :title="'Close drive: ' + closeTarget.job_title + '?'"
            message="Closing this drive means students can no longer apply. You can delete it after closing. This cannot be undone."
            confirm-text="Yes, Close Drive"
            :danger="false"
            @confirm="doClose"
            @cancel="closeTarget = null"
        />


        <!-- Confirm delete -->

        <confirm-modal
            v-if="deleteTarget"
            :title="'Delete drive: ' + deleteTarget.job_title + '?'"
            message="This will permanently delete the drive and all its applications."
            confirm-text="Yes, Delete"
            @confirm="doDelete"
            @cancel="deleteTarget = null"
        />
    </div>
    `,


//     setup() {
//         const { ref, onMounted } = Vue;
//         const loading = ref(true);
//         const data = ref(null);
//         const deleteTarget = ref(null);

//         const statCards = [
//             { key: 'total_drives', label: 'Total Drives', icon: 'bi bi-briefcase-fill',   color: '#1b5ae2' },
//             { key: 'active_drives', label: 'Active Drives', icon: 'bi bi-check-circle-fill', color: '#059669' },
//             { key: 'total_apps', label: 'Total Applicants', icon: 'bi bi-people-fill',      color: '#8241f3' },
//             { key: 'total_selected', label: 'Selected', icon: 'bi bi-patch-check-fill',  color: '#dd7907' }
//         ];



//         let chart = null;

//         async function drawChart(drives) {
//             await Vue.nextTick();
//             const canvas = document.getElementById('companyDrivesChart');
//             if (!canvas || !drives.length) return;
//             if (chart) chart.destroy();
//             chart = new Chart(canvas, {
//                 type: 'bar',
//                 data: {
//                     labels: drives.map(d => d.job_title.length > 20
//                         ? d.job_title.slice(0, 20) + '...' : d.job_title),
//                     datasets: [{
//                         label: 'Applicants',
//                         data: drives.map(d => d.total_applications),
//                         backgroundColor: '#dbeafe',
//                         borderColor: '#2360e3',
//                         borderWidth: 2,
//                         borderRadius: 6
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: { legend: { display: false } },
//                     scales: {
//                         y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#fcfdff' } },
//                         x: { grid: { display: false } }
//                     }
//                 }
//             });
//         }

//         async function load() {
//             loading.value = true;
//             try {
//                 const res = await API.company.dashboard();
//                 data.value = res.data.data;
//                 drawChart(res.data.data.drives);
//             } catch(e) {
//                 Store.handleApiError(e);
//             } finally {
//                 loading.value = false;
//             }
//         }

//         async function closeDrive(drive) {
//             try {
//                 await API.company.closeDrive(drive.id);
//                 Store.Toast.info(`"${drive.job_title}" has been closed.`);
//                 load();
//             } catch(e) { Store.handleApiError(e); }
//         }

//         function confirmDelete(drive) { deleteTarget.value = drive; }

//         async function doDelete() {
//             try {
//                 await API.company.deleteDrive(deleteTarget.value.id);
//                 Store.Toast.success(`"${deleteTarget.value.job_title}" deleted.`);
//                 deleteTarget.value = null;
//                 load();
//             } catch(e) {
//                 Store.handleApiError(e);
//             }
//         }

//         onMounted(load);
//         return { loading, data, statCards, deleteTarget, closeDrive, confirmDelete, doDelete,
//                  formatDate, daysLeftDisplay, daysLeftClass };
//     }
    setup() {
        const { ref, onMounted, onUnmounted } = Vue;
        const loading = ref(true);
        const data = ref(null);
        const closeTarget  = ref(null);
        const deleteTarget = ref(null);
        
        let chart     = null;

        const statCards = [
            { key:'total_drives',   label:'Total Drives',     icon:'bi bi-briefcase-fill',    color:'#1a56db' },
            { key:'active_drives',  label:'Active Drives',    icon:'bi bi-check-circle-fill', color:'#059669' },
            { key:'total_apps',     label:'Total Applicants', icon:'bi bi-people-fill',       color:'#d97706' },
            { key:'total_selected', label:'Selected',         icon:'bi bi-patch-check-fill',  color:'#7c3aed' },
        ];

        async function drawChart(drives) {
            await Vue.nextTick();
            await Vue.nextTick();
            const canvas = document.getElementById('companyDrivesChart');
            if (!canvas) return;
            // FIX: Always destroy previous chart instance before creating new one
            if (chart) { chart.destroy(); chart = null; }

            const labels = drives.map(d => d.job_title.length > 20
                ? d.job_title.substring(0, 18) + '...' : d.job_title);
            const values = drives.map(d => d.total_applications);
            const colors = ['#dbeafe','#d1fae5','#fef3c7','#ede9fe','#fee2e2',
                            '#cffafe','#fce7f3','#ecfccb'];

            chart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Applicants',
                        data: values,
                        backgroundColor: colors.slice(0, values.length),
                        borderColor: ['#1a56db','#059669','#d97706','#7c3aed','#dc2626',
                                      '#0891b2','#db2777','#65a30d'].slice(0, values.length),
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f4f6f9' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }


        
    //     // FIX: destroy chart when component is unmounted to prevent memory leaks
    //     onUnmounted(() => {
    //         if (chart) { chart.destroy(); chart = null; }
    //     });

    //     onMounted(async () => {
    //         try {
    //             const res = await API.company.dashboard();
    //             data.value = res.data.data;
    //             if (data.value.drives.length) {
    //                 drawChart(data.value.drives);
    //             }
    //         } catch(e) {
    //             Store.handleApiError(e);
    //         } finally {
    //             loading.value = false;
    //         }
    //     });

    //     return { loading, data, statCards, formatDate, daysLeftClass, daysLeftDisplay, confirmDelete, confirmDelete, doDelete };
    // }
        async function load() {
            loading.value = true;
            try {
                const res = await API.company.dashboard();
                data.value = res.data.data;
                drawChart(res.data.data.drives);
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                loading.value = false;
            }
        }

        // ── Close drive flow ─────────────────────────────────────────────────
        function confirmClose(drive) {
            closeTarget.value = drive;
        }

        async function doClose() {
            const drive = closeTarget.value;
            closeTarget.value = null;
            try {
                await API.company.closeDrive(drive.id);
                Store.Toast.success(`"${drive.job_title}" has been closed. You can now delete it if needed.`);
                load();
            } catch(e) {
                Store.handleApiError(e);
            }
        }

        // ── Delete drive flow ────────────────────────────────────────────────
        function confirmDelete(drive) {
            deleteTarget.value = drive;
        }

        async function doDelete() {
            const drive = deleteTarget.value;
            deleteTarget.value = null;
            try {
                await API.company.deleteDrive(drive.id);
                Store.Toast.success(`"${drive.job_title}" has been permanently deleted.`);
                load();
            } catch(e) {
                // Show the exact backend error message (e.g. "Approved drives cannot be deleted")
                Store.handleApiError(e);
            }
        }

        onMounted(load);
        return {
            loading, data, statCards,
            closeTarget, deleteTarget,
            confirmClose, doClose,
            confirmDelete, doDelete,
            formatDate, daysLeftDisplay, daysLeftClass
        };
    }

};

