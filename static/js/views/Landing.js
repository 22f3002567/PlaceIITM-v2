// LandingPage - public home page
//Landing.js - The landing page component for PlaceIITM, showcasing features and guiding users to register or access their dashboard.   

window.LandingPage = {
    name: 'LandingPage',
    template: `
    <div style="padding: 40px 20px; text-align: center;">

        <h1>PlaceIITM an Campus Placement Portal</h1>
        <p>
            The official placement portal connecting IIT Madras BS students
            with top recruiters across India.
        </p>

        <div v-if="isLoggedIn">
            <router-link :to="dashboardLink">Go to My Dashboard →</router-link>
        </div>
        <div v-else>
            <router-link to="/register/student">Register as Student</router-link>
            &nbsp;|&nbsp;
            <router-link to="/register/company">Register as Company</router-link>
            &nbsp;|&nbsp;
            <router-link to="/login">Login</router-link>
        </div>

        <hr style="margin: 40px 0;">

        <h2>Three Roles, One Portal</h2>
        <table border="1" cellpadding="12" cellspacing="0" style="margin: 20px auto;">
            <thead>
                <tr>
                    <th>Students</th>
                    <th>Companies</th>
                    <th>Admin (Placement Cell)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        Register and build your profile<br>
                        Browse approved placement drives<br>
                        Apply and track application status<br>
                        Download placement history as CSV
                    </td>
                    <td>
                        Register your company<br>
                        Post placement drives (after admin approval)<br>
                        Review and shortlist applicants<br>
                        Schedule interviews and select candidates
                    </td>
                    <td>
                        Approve / reject companies and drives<br>
                        Search and manage all students<br>
                        View all applications across the portal<br>
                        Generate monthly placement reports
                    </td>
                </tr>
            </tbody>
        </table>

        <hr style="margin: 40px 0;">

        <h2>How It Works</h2>
        <ol style="display: inline-block; text-align: left;">
            <li>Student / Company registers an account</li>
            <li>Admin reviews and approves company profiles</li>
            <li>Company posts placement drives (pending admin approval)</li>
            <li>Admin approves the drive - students can now apply</li>
            <li>Company shortlists, interviews, and selects candidates</li>
            <li>Student views final outcome in their Placement History</li>
        </ol>

        <hr style="margin: 40px 0;">
        <p style="color: gray; font-size: 0.9rem;">
            PlaceIITM V2 - MAD2 Project · IITM BS Program · 2026
        </p>
    </div>
    `,
    setup() {
        const { computed } = Vue;
        const isLoggedIn    = computed(() => Store.Auth.state.isLoggedIn);
        const dashboardLink = computed(() => {
            const role = Store.Auth.role;
            if (role === 'admin')   return '/admin/dashboard';
            if (role === 'company') return '/company/dashboard';
            if (role === 'student') return '/student/dashboard';
            return '/';
        });
        return { isLoggedIn, dashboardLink };
    }
};

// LoginPage
//auth/Login.js - The login component for PlaceIITM, allowing users to authenticate and access their dashboard.

window.LoginPage = {
    name: 'LoginPage',
    template: `
    <div style="padding: 40px 20px; max-width: 400px; margin: 0 auto;">

        <h2>Sign In to PlaceIITM</h2>
        <p>Select your role and enter your credentials.</p>

        <div>
            <strong>Sign in as: </strong>
            <label><input type="radio" v-model="form.role" value="student" /> Student</label>
            &nbsp;
            <label><input type="radio" v-model="form.role" value="company" /> Company</label>
            &nbsp;
            <label><input type="radio" v-model="form.role" value="admin" /> Admin</label>
        </div>
        <br>

        <div>
            <label>Email: </label>
            <input v-model="form.email" type="email" placeholder="your@email.com"
                   size="35" @keyup.enter="submit" />
        </div>
        <div>
            <label>Password: </label>
            <input v-model="form.password" type="password" placeholder="Your password"
                   size="35" @keyup.enter="submit" />
        </div>
        <br>

        <div v-if="errorMsg" style="color: red; margin-bottom: 10px;">
            Error: {{ errorMsg }}
        </div>

        <button @click="submit" :disabled="loading">
            {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>

        <br><br>
        <p>
            No account?
            <router-link to="/register/student">Register as Student</router-link>
            &nbsp;|&nbsp;
            <router-link to="/register/company">Register as Company</router-link>
        </p>

        <hr>
        <p style="font-size: 0.85rem; color: gray;">
            Demo admin credentials:<br>
            Email: admin@placeiitm.ac.in<br>
            Password: Admin@PlaceIITM2026
        </p>
    </div>
    `,
    setup() {
        const { ref, reactive } = Vue;
        const router   = VueRouter.useRouter();
        const loading  = ref(false);
        const errorMsg = ref('');
        const form     = reactive({ email: '', password: '', role: 'student' });

        async function submit() {
            errorMsg.value = '';
            if (!form.role)     { errorMsg.value = 'Please select your role.'; return; }
            if (!form.email)    { errorMsg.value = 'Email is required.'; return; }
            if (!form.password) { errorMsg.value = 'Password is required.'; return; }

            loading.value = true;
            try {
                const res = await API.auth.login(form);
                const { access_token, refresh_token, user } = res.data.data;
                Store.Auth.login(user, access_token, refresh_token);
                Store.Toast.success(`Welcome back, ${user.username}!`);
                const dest = {
                    admin:   '/admin/dashboard',
                    company: '/company/dashboard',
                    student: '/student/dashboard'
                };
                router.push(dest[user.role] || '/');
            } catch(e) {
                errorMsg.value = e?.response?.data?.message || 'Login failed. Please check your credentials.';
            } finally {
                loading.value = false;
            }
        }

        return { form, loading, errorMsg, submit };
    }
};


// RegisterStudentPage
// auth/RegisterStudent.js - The student registration component for PlaceIITM, allowing students to create an account and access placement opportunities.

window.RegisterStudentPage = {
    name: 'RegisterStudentPage',
    template: `
    <div style="padding: 40px 20px; max-width: 600px; margin: 0 auto;">

        <h2>Student Registration</h2>
        <p>Create your placement profile. Fields marked * are required.</p>

        <h3>Account Details</h3>
        <div>
            <label>Username *: </label>
            <input v-model="form.username" placeholder="siddharth_iitm" />
        </div>
        <div>
            <label>Email *: </label>
            <input v-model="form.email" type="email" placeholder="roll@ds.study.iitm.ac.in" size="35" />
        </div>
        <div>
            <label>Roll Number *: </label>
            <input v-model="form.roll_no" placeholder="22f3002567" />
        </div>
        <div>
            <label>Password * (min 6 chars): </label>
            <input v-model="form.password" type="password" />
        </div>
        <div>
            <label>Confirm Password *: </label>
            <input v-model="form.confirm_password" type="password" />
        </div>

        <h3>Personal Details</h3>
        <div>
            <label>Full Name *: </label>
            <input v-model="form.full_name" placeholder="As on official records" size="35" />
        </div>
        <div>
            <label>Phone: </label>
            <input v-model="form.phone" type="tel" placeholder="10-digit mobile" />
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
                <option value="">-- Select --</option>
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
        </div>
        <div>
            <label>Skills (comma-separated): </label>
            <input v-model="form.skills" size="45" placeholder="Python, Machine Learning, SQL" />
        </div>

        <br>
        <button @click="submit" :disabled="loading">
            {{ loading ? 'Creating account...' : 'Create Account' }}
        </button>
        &nbsp;
        <router-link to="/login">Already registered? Login</router-link>
    </div>
    `,
    setup() {
        const { ref, reactive, onMounted } = Vue;
        const router  = VueRouter.useRouter();
        const loading = ref(false);
        const lookups = reactive({ departments: [], degrees: [] });

        const form = reactive({
            username: '', email: '', password: '', confirm_password: '',
            full_name: '', phone: '', roll_no: '', department: '', degree: '',
            graduation_year: '', cgpa: '', skills: ''
        });

        onMounted(async () => {
            try {
                const res = await API.student.lookups();
                Object.assign(lookups, res.data.data);
            } catch(e) { /* lookups failing should not block registration */ }
        });

        async function submit() {
            if (!form.username || !form.email || !form.password || !form.full_name || !form.roll_no)
                return Store.Toast.warning('Please fill all required fields (*).');
            if (form.password !== form.confirm_password)
                return Store.Toast.warning('Passwords do not match.');
            if (form.password.length < 6)
                return Store.Toast.warning('Password must be at least 6 characters.');

            loading.value = true;
            try {
                await API.auth.registerStudent(form);
                Store.Toast.success('Account created! You can now log in.');
                router.push('/login');
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                loading.value = false;
            }
        }

        return { form, lookups, loading, submit };
    }
};


// RegisterCompanyPage
//auth/RegisterCompany.js - The company registration component for PlaceIITM, allowing companies to sign up and await admin approval.

window.RegisterCompanyPage = {
    name: 'RegisterCompanyPage',
    template: `
    <div style="padding: 40px 20px; max-width: 600px; margin: 0 auto;">

        <h2>Company Registration</h2>
        <p>Register your company to post placement drives.</p>
        <p><strong>Note:</strong> Your registration will be reviewed by the Placement Cell before you can post drives.</p>

        <h3>Account Credentials</h3>
        <div>
            <label>Username *: </label>
            <input v-model="form.username" placeholder="google_hr" />
        </div>
        <div>
            <label>Email *: </label>
            <input v-model="form.email" type="email" placeholder="hr@company.com" size="35" />
        </div>
        <div>
            <label>Password * (min 6 chars): </label>
            <input v-model="form.password" type="password" />
        </div>
        <div>
            <label>Confirm Password *: </label>
            <input v-model="form.confirm_password" type="password" />
        </div>

        <h3>Company Information</h3>
        <div>
            <label>Company Name *: </label>
            <input v-model="form.company_name" placeholder="Google India Pvt. Ltd." size="40" />
        </div>
        <div>
            <label>Industry: </label>
            <select v-model="form.industry">
                <option value="">-- Select --</option>
                <option v-for="i in industries" :key="i">{{ i }}</option>
            </select>
        </div>
        <div>
            <label>Location / HQ: </label>
            <input v-model="form.location" placeholder="Bengaluru, Karnataka" size="35" />
        </div>
        <div>
            <label>Website: </label>
            <input v-model="form.website" type="url" placeholder="https://company.com" size="35" />
        </div>
        <div>
            <label>Description: </label><br>
            <textarea v-model="form.description" rows="3" cols="50"
                placeholder="Brief description of your company..."></textarea>
        </div>

        <h3>HR Point of Contact</h3>
        <div>
            <label>HR Name: </label>
            <input v-model="form.hr_name" placeholder="Priya Sharma" />
        </div>
        <div>
            <label>HR Contact (phone or email): </label>
            <input v-model="form.hr_contact" placeholder="+91 9876543210" size="35" />
        </div>

        <br>
        <button @click="submit" :disabled="loading">
            {{ loading ? 'Submitting...' : 'Submit for Approval' }}
        </button>
        &nbsp;
        <router-link to="/login">Already registered? Login</router-link>
    </div>
    `,
    setup() {
        const { ref, reactive } = Vue;
        const router = VueRouter.useRouter();
        const loading = ref(false);

        const industries = [
            'Technology & Software', 'Finance & FinTech', 'Healthcare & Biotech',
            'E-Commerce & Internet', 'Consulting & Analytics', 'Automotive & Robotics',
            'Government & Defense', 'Other'
        ];

        const form = reactive({
            username: '', 
            email: '', 
            password: '', 
            confirm_password: '',
            company_name: '', 
            industry: '', 
            location: '', 
            website: '',
            description: '', 
            hr_name: '', 
            hr_contact: ''
        });

        async function submit() {
            if (!form.username || !form.email || !form.password || !form.company_name)
                return Store.Toast.warning('Please fill all required fields (*).');
            if (form.password !== form.confirm_password)
                return Store.Toast.warning('Passwords do not match.');
            if (form.password.length < 6)
                return Store.Toast.warning('Password must be at least 6 characters.');

            loading.value = true;
            try {
                await API.auth.registerCompany(form);
                Store.Toast.success('Registration submitted! Awaiting admin approval.');
                router.push('/login');
            } catch(e) {
                Store.handleApiError(e);
            } finally {
                loading.value = false;
            }
        }

        return { form, industries, loading, submit };
    }
};