window.CompanyProfile = {
    name: 'CompanyProfile',

    template: `
    <div>
        <h2>Company Profile</h2>

        <div v-if="loading"><p>Loading...</p></div>
        <div v-else-if="company">

            <h3>Current Info</h3>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr><th>Company Name</th><td>{{ company.company_name }}</td></tr>
                <tr><th>Industry</th><td>{{ company.industry || '-' }}</td></tr>
                <tr><th>Location</th><td>{{ company.location || '-' }}</td></tr>
                <tr><th>HR Name</th><td>{{ company.hr_name || '-' }}</td></tr>
                <tr><th>HR Contact</th><td>{{ company.hr_contact || '-' }}</td></tr>
                <tr><th>Website</th><td>{{ company.website || '-' }}</td></tr>
                <tr><th>Approval Status</th><td>{{ company.approval_status }}</td></tr>
            </table>

            <h3>Edit Profile</h3>
            <div>
                <label>Industry: </label>
                <select v-model="form.industry">
                    <option value="">-- Select --</option>
                    <option v-for="i in industries" :key="i">{{ i }}</option>
                </select>
            </div>
            <div>
                <label>Location: </label>
                <input v-model="form.location" placeholder="e.g. Bengaluru, Karnataka" />
            </div>
            <div>
                <label>HR Name: </label>
                <input v-model="form.hr_name" placeholder="e.g. Priya Sharma" />
            </div>
            <div>
                <label>HR Contact: </label>
                <input v-model="form.hr_contact" placeholder="Phone or email" />
            </div>
            <div>
                <label>Website: </label>
                <input v-model="form.website" type="url" placeholder="https://www.company.com" />
            </div>
            <div>
                <label>Description: </label><br>
                <textarea v-model="form.description" rows="4" cols="50"
                    placeholder="Brief description of your company..."></textarea>
            </div>
            <br>
            <button @click="save" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
        </div>
    </div>
    `,
    setup() {
        const { ref, reactive, onMounted } = Vue;
        const loading = ref(true);
        const saving = ref(false);
        const company = ref(null);

        const industries = [
            'Technology & Software','Finance & FinTech','Healthcare & Biotech',
            'E-Commerce & Internet','Consulting & Analytics','Automotive & Robotics',
            'Government & Defense','Other'
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
                Object.keys(form).forEach(k => { form[k] = company.value[k] || ''; });
            } catch(e) { Store.handleApiError(e); }
            finally { loading.value = false; }
        }

        async function save() {
            saving.value = true;
            try {
                const res = await API.company.updateProfile(form);
                company.value = res.data.data;
                Store.Toast.success('Profile updated successfully!');
            } catch(e) { Store.handleApiError(e); }
            finally { saving.value = false; }
        }

        onMounted(load);
        return { loading, saving, company, form, industries, save };
    }
};