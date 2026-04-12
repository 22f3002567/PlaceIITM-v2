// student/MyApplications.js

window.StudentMyApplications = {
    name: 'StudentMyApplications',
    template: `
    <div class="container py-4">
        <div class="ppa-page-header">
            <h2>My Applications</h2>
            <p>Track the status of all your placement applications.</p>
        </div>


        <!-- Filter -->

        <div class="ppa-card mb-4">
            <div class="card-body p-3">
                <div class="d-flex gap-2 flex-wrap align-items-center">
                    <span class="text-muted small fw-600">Filter:</span>
                    <button
                        v-for="s in ['', ...appStatuses]" :key="s"
                        class="btn btn-sm"
                        :class="statusFilter === s ? 'btn-primary' : 'btn-outline-secondary'"
                        @click="statusFilter = s">
                        {{ s || 'All' }}
                    </button>
                </div>
            </div>
        </div>


        <app-spinner v-if="loading" />
        <template v-else>
            <template v-if="filteredApps.length">
                <div class="ppa-card mb-3" v-for="app in filteredApps" :key="app.id">
                    <div class="card-body p-4">


                        <!-- App header -->
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h6 class="fw-700 mb-0">{{ app.job_title }}</h6>
                                <div class="text-muted small">
                                    {{ app.company_name }}
                                    <span v-if="app.job_type"> · {{ app.job_type }}</span>
                                    <span v-if="app.salary_range"> · {{ app.salary_range }}</span>
                                </div>
                            </div>
                            <span class="text-muted small">Applied {{ formatDate(app.applied_at) }}</span>
                        </div>

                        <!-- Status: Rejected ;- special banner -->
                        <div v-if="app.status === 'Rejected'"
                             class="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
                            <i class="bi bi-x-circle-fill"></i>
                            <span class="fw-600">Application Rejected</span>
                        </div>

                        <!-- Status: Selected --- celebration banner -->
                        <div v-else-if="app.status === 'Selected'"
                             class="alert alert-success d-flex align-items-center gap-2 py-2 mb-3">
                            <i class="bi bi-patch-check-fill"></i>
                            <span class="fw-600">🎉 Congratulations! You have been Selected!</span>
                        </div>

                        <!-- Visual stepper (for Applied / Shortlisted / Interview / Selected) -->
                        <div v-else class="ppa-stepper mb-3">

                            <!-- Step 1: Applied -->
                            <div class="text-center" style="min-width:70px;">
                                <div class="ppa-step-circle mx-auto"
                                     :style="stepCircleStyle('Applied', app.status)">
                                    <i v-if="isPast('Applied', app.status)" class="bi bi-check-lg"></i>
                                    <span v-else>1</span>
                                </div>
                                <div class="small mt-1" :style="stepLabelStyle('Applied', app.status)">Applied</div>
                            </div>

                            <div class="ppa-step-line"
                                 :style="{background: isPast('Shortlisted', app.status) ? '#1a56db' : '#e5e7eb'}">
                            </div>

                            <!-- Step 2: Shortlisted -->
                            <div class="text-center" style="min-width:80px;">
                                <div class="ppa-step-circle mx-auto"
                                     :style="stepCircleStyle('Shortlisted', app.status)">
                                    <i v-if="isPast('Shortlisted', app.status)" class="bi bi-check-lg"></i>
                                    <span v-else>2</span>
                                </div>
                                <div class="small mt-1" :style="stepLabelStyle('Shortlisted', app.status)">Shortlisted</div>
                            </div>

                            <div class="ppa-step-line"
                                 :style="{background: isPast('Interview', app.status) ? '#7c3aed' : '#e5e7eb'}">
                            </div>



                            <!-- Step 3: Interview -->
                            <div class="text-center" style="min-width:75px;">
                                <div class="ppa-step-circle mx-auto"
                                     :style="stepCircleStyle('Interview', app.status)">
                                    <i v-if="isPast('Interview', app.status)" class="bi bi-check-lg"></i>
                                    <span v-else>3</span>
                                </div>
                                <div class="small mt-1" :style="stepLabelStyle('Interview', app.status)">Interview</div>
                            </div>

                            <div class="ppa-step-line"
                                 :style="{background: app.status === 'Selected' ? '#059669' : '#e5e7eb'}">
                            </div>

                            <!-- Step 4: Selected -->
                            <div class="text-center" style="min-width:70px;">
                                <div class="ppa-step-circle mx-auto"
                                     :style="stepCircleStyle('Selected', app.status)">
                                    <i v-if="app.status === 'Selected'" class="bi bi-check-lg"></i>
                                    <span v-else>4</span>
                                </div>
                                <div class="small mt-1" :style="stepLabelStyle('Selected', app.status)">Selected</div>
                            </div>
                        </div>



                        <!-- Interview details (if scheduled) -->
                        <div v-if="app.interview_date"
                             class="alert alert-light border small py-2 mb-3">
                            <i class="bi bi-camera-video-fill me-2 text-muted"></i>
                            <strong>Interview Scheduled:</strong>
                            {{ formatDateTime(app.interview_date) }}
                            <span v-if="app.interview_mode"> · {{ app.interview_mode }}</span>
                            <span v-if="app.interview_location"> · {{ app.interview_location }}</span>
                        </div>



                        <!-- Company notes -->
                        <div v-if="app.notes"
                             class="alert alert-light border small py-2 mb-0">
                            <i class="bi bi-chat-left-text me-2 text-muted"></i>
                            <strong>Note from company:</strong> {{ app.notes }}
                        </div>

                    </div>
                </div>
            </template>

            <app-empty v-else
                icon="bi bi-send"
                message="No applications found."
                :subtext="statusFilter ? 'Try clearing the filter.' : 'You have not applied to any drives yet.'">
                <router-link to="/student/drives" class="btn btn-sm btn-primary mt-2">
                    Browse Drives
                </router-link>
            </app-empty>
        </template>
    </div>
    `,

    setup() {
        const { ref, computed, onMounted } = Vue;
        const loading = ref(true);
        const applications = ref([]);
        const statusFilter = ref('');
        const appStatuses = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

        // Status order for the stepper
        const statusOrder = ['Applied', 'Shortlisted', 'Interview', 'Selected'];

        const filteredApps = computed(() => {
            if (!statusFilter.value) return applications.value;
            return applications.value.filter(a => a.status === statusFilter.value);
        });

        function isPast(step, currentStatus) {
            const stepIdx = statusOrder.indexOf(step);
            const currentIdx = statusOrder.indexOf(currentStatus);
            return currentIdx > stepIdx;
        }

        function isActive(step, currentStatus) { return step === currentStatus; }

        function stepCircleStyle(step, currentStatus) {
            const colors = {
                Applied: { bg: '#dbeafe', text: '#1e40af', active: '#1a56db' },
                Shortlisted: { bg: '#fef3c7', text: '#92400e', active: '#d97706' },
                Interview: { bg: '#ede9fe', text: '#5b21b6', active: '#7c3aed' },
                Selected: { bg: '#d1fae5', text: '#065f46', active: '#059669' }
            };
            const c = colors[step];
            if (isActive(step, currentStatus)) {
                return `background:${c.active}; color:white; border:2px solid ${c.active};`;
            }
            if (isPast(step, currentStatus)) {
                return `background:${c.active}; color:white; border:2px solid ${c.active};`;
            }
            return `background:#f3f4f6; color:#9ca3af; border:2px solid #e5e7eb;`;
        }

        function stepLabelStyle(step, currentStatus) {
            const colors = {
                Applied: '#1a56db', Shortlisted: '#d97706',
                Interview: '#7c3aed', Selected: '#059669'
            };
            if (isActive(step, currentStatus) || isPast(step, currentStatus)) {
                return `color:${colors[step]}; font-weight:600;`;
            }
            return 'color:#9ca3af;';
        }

        function formatDateTime(isoStr) {
            if (!isoStr) return '';
            return new Date(isoStr).toLocaleString('en-IN', {
                day: '2-digit', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit', 
                minute: '2-digit'
            });
        }

        async function load() {
            loading.value = true;
            try {
                const res = await API.student.getApplications();
                applications.value = res.data.data.applications;
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                loading.value = false;
            }
        }

        onMounted(load);
        return {
            loading, 
            filteredApps, 
            statusFilter, 
            appStatuses,
            isPast, 
            stepCircleStyle, 
            stepLabelStyle,
            formatDate, 
            formatDateTime
        };
    }
};
