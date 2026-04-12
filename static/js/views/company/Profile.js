// company/Profile.js

window.CompanyProfile = {
    name: 'CompanyProfile',
    template: `
    <div class="container py-4">
        <div class="ppa-page-header">
            <h2>Company Profile</h2>
            <p>Update your company information visible to students and the Placement Cell.</p>
        </div>

        <app-spinner v-if="loading" />
        <div v-else-if="company" class="row g-4">



            <!-- Left: Summary card -->


            <div class="col-md-4">
                <div class="ppa-card mb-3">
                    <div class="card-body p-4 text-center">


                        <!-- Avatar: first letter of company name -->


                        <div class="ppa-company-avatar mx-auto mb-3"
                             style="width:64px; height:64px; font-size:1.6rem; border-radius:12px;">
                            {{ company.company_name[0].toUpperCase() }}
                        </div>
                        <h5 class="fw-700 mb-1">{{ company.company_name }}</h5>
                        <p class="text-muted small mb-1">{{ company.industry || 'Industry not set' }}</p>
                        <p class="text-muted small mb-3">
                            <i class="bi bi-geo-alt me-1"></i>{{ company.location || 'Location not set' }}
                        </p>
                        <status-badge :status="company.approval_status" />
                        <div v-if="company.website" class="mt-3">
                            <a :href="company.website" target="_blank" class="small text-primary">
                                <i class="bi bi-link-45deg me-1"></i>{{ company.website }}
                            </a>
                        </div>
                    </div>
                </div>




                <!-- HR contact card -->


                <div class="ppa-card">
                    <div class="card-body p-3">
                        <h6 class="fw-600 mb-3">HR Contact</h6>
                        <p class="text-muted small mb-1">
                            <i class="bi bi-person me-2"></i>{{ company.hr_name || 'Not set' }}
                        </p>
                        <p class="text-muted small mb-0">
                            <i class="bi bi-telephone me-2"></i>{{ company.hr_contact || 'Not set' }}
                        </p>
                    </div>
                </div>
            </div>



            <!-- Right: Edit form -->

            <div class="col-md-8">
                <div class="ppa-card">
                    <div class="card-body p-4">
                        <h5 class="fw-600 mb-4">Edit Profile</h5>

                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Industry</label>
                                <select v-model="form.industry" class="form-select">
                                    <option value="">== Select ==</option>
                                    <option v-for="i in industries" :key="i">{{ i }}</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Location</label>
                                <input v-model="form.location" class="form-control"
                                       placeholder="e.g. Bengaluru, Karnataka">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">HR Name</label>
                                <input v-model="form.hr_name" class="form-control"
                                       placeholder="e.g. Priya Sharma">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">HR Contact</label>
                                <input v-model="form.hr_contact" class="form-control"
                                       placeholder="Phone or email">
                            </div>
                            <div class="col-12">
                                <label class="form-label">Website</label>
                                <input v-model="form.website" type="url" class="form-control"
                                       placeholder="https://www.company.com">
                            </div>
                            <div class="col-12">
                                <label class="form-label">Company Description</label>
                                <textarea v-model="form.description" class="form-control" rows="4"
                                          placeholder="Brief description of your company and what you do..."></textarea>
                            </div>
                            <div class="col-12">
                                <button class="btn btn-primary" @click="save" :disabled="saving">
                                    <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                                    <i v-else class="bi bi-save me-1"></i>
                                    {{ saving ? 'Saving...' : 'Save Changes' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,




    setup() {
        const { ref, reactive, onMounted } = Vue;
        const loading = ref(true);
        const saving  = ref(false);
        const company = ref(null);

        const industries = [
            'Technology & Software', 
            'Finance & FinTech', 
            'Healthcare & Biotech',
            'E-Commerce & Internet', 
            'Consulting & Analytics', 
            'Automotive & Robotics',
            'Government & Defense', 
            'Other'
        ];

        const form = reactive({
            industry: '', 
            location: '', 
            hr_name: '', 
            hr_contact: '', 
            website: '', 
            description: ''
        });

        async function load() {
            try {
                const res = await API.company.getProfile();
                company.value = res.data.data;
                // Populateing form with existing data
                Object.keys(form).forEach(k => { form[k] = company.value[k] || ''; });
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                loading.value = false;
            }
        }

        async function save() {
            saving.value = true;
            try {
                const res = await API.company.updateProfile(form);
                company.value = res.data.data;
                Store.Toast.success('Profile updated successfully!');
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                saving.value = false;
            }
        }

        onMounted(load);
        return { loading, saving, company, form, industries, save };
    }
};
