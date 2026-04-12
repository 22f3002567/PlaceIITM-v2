
// student/BrowseDrives.js

window.StudentBrowseDrives = {
    name: 'StudentBrowseDrives',


    template: `
    <div class="container py-4">
        <div class="ppa-page-header">
            <h2>Browse Placement Drives</h2>
            <p>All currently open drives. Apply before the deadline.</p>
        </div>



        <!-- Search bar -->
        <div class="ppa-card mb-4">
            <div class="card-body p-3">
                <div class="row g-2 align-items-end">
                    <div class="col-md-7">
                        <input v-model="search" class="form-control"
                               placeholder="Search by company, role, skills or location..."
                               @keyup.enter="load">
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-primary" @click="load">
                            <i class="bi bi-search me-1"></i>Search
                        </button>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-outline-secondary" @click="clearSearch">Clear</button>
                    </div>
                </div>
            </div>
        </div>


        <app-spinner v-if="loading" />
        <template v-else>
            <p class="text-muted small mb-3">{{ drives.length }} drive(s) found</p>

            <div v-if="drives.length" class="row g-3">
                <div class="col-md-6" v-for="drive in drives" :key="drive.id">
                    <div class="ppa-drive-card">
                        <div class="p-4">



                            <!-- Header: avatar + title -->
                            <div class="d-flex align-items-start gap-3 mb-3">
                                <div class="ppa-company-avatar">
                                    {{ drive.company_name[0].toUpperCase() }}
                                </div>
                                <div>
                                    <h6 class="fw-700 mb-0">{{ drive.job_title }}</h6>
                                    <div class="text-muted small">{{ drive.company_name }}</div>
                                </div>
                            </div>



                            <!-- Meta info -->
                            <div class="row g-1 mb-3 text-muted small">
                                <div v-if="drive.job_type" class="col-6">
                                    <i class="bi bi-briefcase me-1"></i>{{ drive.job_type }}
                                </div>
                                <div v-if="drive.salary_range" class="col-6">
                                    <i class="bi bi-currency-rupee me-1"></i>{{ drive.salary_range }}
                                </div>
                                <div v-if="drive.location" class="col-6">
                                    <i class="bi bi-geo-alt me-1"></i>{{ drive.location }}
                                </div>
                                <div v-if="drive.min_cgpa" class="col-6">
                                    <i class="bi bi-award me-1"></i>Min CGPA: {{ drive.min_cgpa }}
                                </div>
                            </div>



                            <!-- Deadline -->
                            <div v-if="drive.application_deadline"
                                 class="mb-3 small d-flex align-items-center gap-2">
                                <i class="bi bi-calendar-event"></i>
                                <span>{{ formatDate(drive.application_deadline) }}</span>
                                <span :class="daysLeftClass(drive.days_left)" class="small ms-1">
                                    · {{ daysLeftDisplay(drive.days_left) }}
                                </span>
                            </div>



                            <!-- Skills -->
                            <div v-if="drive.required_skills" class="mb-3 small text-muted">
                                <i class="bi bi-tools me-1"></i>{{ drive.required_skills }}
                            </div>



                            <!-- Apply / Applied badge -->
                            <div class="d-flex align-items-center justify-content-between">
                                <span class="text-muted small">
                                    {{ drive.total_applications }} applicant(s)
                                </span>
                                <div>
                                    <span v-if="appliedIds.has(drive.id)"
                                          class="ppa-badge badge-applied">
                                        <i class="bi bi-check-circle me-1"></i>Applied
                                    </span>
                                    <button v-else
                                            class="btn btn-sm btn-primary"
                                            :disabled="applying === drive.id"
                                            @click="apply(drive)">
                                        <span v-if="applying === drive.id"
                                              class="spinner-border spinner-border-sm me-1"></span>
                                        <i v-else class="bi bi-send me-1"></i>
                                        Apply Now
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <app-empty v-else
                icon="bi bi-briefcase"
                message="No open drives found."
                :subtext="search ? 'Try a different search term.' : 'Check back later for new drives.'" />
        </template>
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

                // Fetch drives + applied application IDs in parallel.
                // Applications endpoint is lightweight ;;- just statuses + drive IDs.
                const [drivesRes, appsRes] = await Promise.all([
                    API.student.getDrives({ search: search.value }),
                    API.student.getApplications()
                ]);
                drives.value = drivesRes.data.data;
                const apps = appsRes.data.data.applications || [];
                appliedIds.value = new Set(apps.map(a => a.drive_id));
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                loading.value = false;
            }
        }

        function clearSearch() {
            search.value = '';
            load();
        }

        async function apply(drive) {
            applying.value = drive.id;
            try {
                await API.student.applyToDrive(drive.id);
                appliedIds.value.add(drive.id);
                Store.Toast.success(`Applied to ${drive.job_title} at ${drive.company_name}!`);
                // Update total applications count on the card
                const d = drives.value.find(x => x.id === drive.id);
                if (d) d.total_applications += 1;
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                applying.value = null;
            }
        }

        onMounted(load);
        return { loading, drives, appliedIds, search, applying, load, clearSearch, apply,
                 formatDate, daysLeftDisplay, daysLeftClass };
    }
};
