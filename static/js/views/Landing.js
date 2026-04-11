// LandingPage - public home page
//Landing.js - The landing page component for PlaceIITM, showcasing features and guiding users to register or access their dashboard.   

window.LandingPage = {
    name: 'LandingPage',
    template: `
    <div>
        <!-- Hero -->
        <section class="ppa-hero">
            <div class="container text-center">
                <i class="bi bi-mortarboard-fill" style="font-size:3rem; opacity:0.8;"></i>
                <h1 class="mt-3 mb-3">PlaceIITM</h1>
                <p class="col-md-7 mx-auto mb-4">
                    Where talent meets opportunity. The official campus placement portal
                    connecting IIT students with top recruiters across India.
                </p>
                <template v-if="isLoggedIn">
                    <router-link :to="dashboardLink" class="btn btn-warning btn-lg fw-600 me-2">
                        <i class="bi bi-grid me-1"></i>Go to Dashboard
                    </router-link>
                </template>
                <template v-else>
                    <router-link to="/register/student" class="btn btn-warning btn-lg fw-600 me-2">
                        <i class="bi bi-mortarboard me-1"></i>Register as Student
                    </router-link>
                    <router-link to="/register/company" class="btn btn-outline-light btn-lg">
                        <i class="bi bi-building me-1"></i>Register Company
                    </router-link>
                </template>
            </div>
        </section>

        <!-- Feature cards -->
        <div class="container py-5">
            <div class="row g-4 mb-5">
                <div class="col-md-4" v-for="card in featureCards" :key="card.title">
                    <div class="ppa-card h-100">
                        <div class="card-body p-4">
                            <i :class="card.icon" style="font-size:2rem;" class="mb-3 d-block" :style="{color: card.color}"></i>
                            <h5 class="fw-600 mb-2">{{ card.title }}</h5>
                            <p class="text-muted small mb-3">{{ card.desc }}</p>
                            <router-link :to="card.link" class="btn btn-sm" :style="{color: card.color, border: '1px solid ' + card.color}">
                                {{ card.cta }}
                            </router-link>
                        </div>
                    </div>
                </div>
            </div>

            <!-- How it works -->
            <div class="ppa-card">
                <div class="card-body p-4">
                    <h5 class="fw-600 mb-4 text-center">How It Works</h5>
                    <div class="row g-3 text-center">
                        <div class="col-6 col-md-3" v-for="step in howItWorks" :key="step.step">
                            <div class="p-3 rounded-3" style="background:var(--ppa-gray-50);">
                                <div class="mb-2" style="font-size:1.75rem;">
                                    <i :class="step.icon" :style="{color: step.color}"></i>
                                </div>
                                <div class="fw-600 small mb-1">{{ step.step }}. {{ step.title }}</div>
                                <div class="text-muted" style="font-size:0.8rem;">{{ step.desc }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer style="background:white; border-top:1px solid var(--ppa-gray-200); padding:1.5rem 0; text-align:center; color:var(--ppa-gray-500); font-size:0.85rem;">
            PlaceIITM V2 :- Campus Placement Portal &copy; 2026 · MAD2 Project
        </footer>
    </div>
    `,
    setup() {
        const { computed } = Vue;
        const isLoggedIn = computed(() => Store.Auth.state.isLoggedIn);
        
        const dashboardLink = computed(() => {
            const role = Store.Auth.role;
            if (role === 'admin') return '/admin/dashboard';
            if (role === 'company') return '/company/dashboard';
            if (role === 'student') return '/student/dashboard';
            return '/';
        });

        const featureCards = [

            { icon: 'bi bi-mortarboard-fill', color: '#1a56db', title: 'For Students',
              desc: 'Build your placement profile, upload resume, browse open drives and track your application status in real time.',
              link: '/register/student', cta: 'Register Now' },

            { icon: 'bi bi-building-fill', color: '#059669', title: 'For Companies',
              desc: 'Register your company, post placement drives, review applicants and manage your entire hiring pipeline.',
              link: '/register/company', cta: 'Register Company' },

            { icon: 'bi bi-shield-lock-fill', color: '#d97706', title: 'For Admin',
              desc: 'Approve companies and drives, manage students, monitor applications and view placement analytics.',
              link: '/login', cta: 'Admin Login' }
        ];

        const howItWorks = [
            { step:1, icon:'bi bi-person-plus-fill', color:'#1a56db', title:'Register', desc:'Students and companies create accounts' },
            { step:2, icon:'bi bi-check-circle-fill', color:'#059669', title:'Approve', desc:'Admin reviews and approves companies' },
            { step:3, icon:'bi bi-briefcase-fill', color:'#7c3aed', title:'Post Drive', desc:'Companies post placement drives' },
            { step:4, icon:'bi bi-send-fill', color:'#d97706', title:'Apply', desc:'Students apply and track their status' }
        ];

        return { isLoggedIn, dashboardLink, featureCards, howItWorks };
    }
};


// LoginPage
//auth/Login.js - The login component for PlaceIITM, allowing users to authenticate and access their dashboard.

window.LoginPage = {
    name: 'LoginPage',
    template: `
    <div class="ppa-auth-wrapper">
        <div class="ppa-auth-card">
            <div class="text-center mb-4">
                <i class="bi bi-mortarboard-fill text-primary" style="font-size:2.5rem;"></i>
                <h3 class="fw-700 mt-2 mb-1">Sign In to PlaceIITM</h3>
                <p class="text-muted small">Welcome back. Select your role and sign in.</p>
            </div>

            <!-- Role selector -->
            <div class="mb-4">
                <label class="form-label">Sign in as</label>
                <div class="d-flex gap-2">
                    <div v-for="r in roles" :key="r.value" class="flex-fill">
                        <input type="radio" class="btn-check" :id="'role_'+r.value"
                               v-model="form.role" :value="r.value">
                        <label class="btn btn-outline-secondary w-100 text-start"
                               :class="{'active': form.role === r.value}"
                               :for="'role_'+r.value" style="font-size:0.85rem; padding:0.5rem 0.75rem;">
                            <i :class="r.icon + ' me-1'"></i>{{ r.label }}
                        </label>
                    </div>
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">Email</label>
                <input v-model="form.email" type="email" class="form-control"
                       placeholder="your@email.com" @keyup.enter="submit">
            </div>
            <div class="mb-4">
                <label class="form-label">Password</label>
                <div class="input-group">
                    <input v-model="form.password" :type="showPw ? 'text' : 'password'"
                           class="form-control" placeholder="Enter your password" @keyup.enter="submit">
                    <button class="btn btn-outline-secondary" @click="showPw=!showPw" type="button">
                        <i :class="showPw ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                    </button>
                </div>
            </div>

            <!-- Inline error banner -->
            <div v-if="errorMsg" class="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
                <i class="bi bi-x-circle-fill"></i>
                <span>{{ errorMsg }}</span>
            </div>

            <button class="btn btn-primary w-100 py-2" @click="submit" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                <i v-else class="bi bi-box-arrow-in-right me-1"></i>
                {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>

            <hr class="my-4">
            <div class="text-center small text-muted">
                No account?
                <router-link to="/register/student" class="fw-600">Register as Student</router-link>
                &nbsp;·&nbsp;
                <router-link to="/register/company" class="fw-600">Register Company</router-link>
            </div>

            <div class="alert alert-info mt-3 small mb-0">
                <i class="bi bi-info-circle me-1"></i>
                <strong>Demo admin:</strong> siddharth@placeiitm.ac.in / Siddharth@PlaceIITM2026
            </div>
        </div>
    </div>
    `,
    setup() {
        const { ref, reactive } = Vue;
        const router = VueRouter.useRouter();
        const loading = ref(false);
        const showPw = ref(false);
        const errorMsg = ref('');
        const form = reactive({ email: '', password: '', role: 'student' });

        const roles = [
            { value: 'student', label: 'Student', icon: 'bi bi-mortarboard' },
            { value: 'company', label: 'Company', icon: 'bi bi-building' },
            { value: 'admin', label: 'Admin', icon: 'bi bi-shield-lock' }
        ];

        async function submit() {
            errorMsg.value = '';
            if (!form.role) { 
                errorMsg.value = 'Please select your role.'; return; 
            }

            if (!form.email) { 
                errorMsg.value = 'Email is required.'; return; 
            }

            if (!form.password) { 
                errorMsg.value = 'Password is required.'; return; 
            }
            loading.value = true;
            try {
                const res = await API.auth.login(form);
                const { access_token, refresh_token, user } = res.data.data;
                Store.Auth.login(user, access_token, refresh_token);
                Store.Toast.success(`Welcome back, ${user.username}!`);

                const dest = { 
                    admin:'/admin/dashboard', 
                    company:'/company/dashboard', 
                    student:'/student/dashboard' 
                };
                router.push(dest[user.role] || '/');

            } catch(e) {
                errorMsg.value = e?.response?.data?.message || 'Login failed. Please check your credentials.';

            } finally {
                loading.value = false;
            }
        }

        return { form, roles, loading, showPw, errorMsg, submit };
    }
};


// RegisterStudentPage
// auth/RegisterStudent.js - The student registration component for PlaceIITM, allowing students to create an account and access placement opportunities.

window.RegisterStudentPage = {
    name: 'RegisterStudentPage',
    template: `
    <div class="container py-4">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="ppa-card">
                    <div class="card-body p-4">
                        <div class="mb-4">
                            <h3 class="fw-700 mb-1 text-primary">
                                <i class="bi bi-person-plus-fill me-2"></i>Student Registration
                            </h3>
                            <p class="text-muted small mb-0">
                                Create your placement profile. Fields marked * are required.
                            </p>
                        </div>

                        <!-- Account Details -->
                        <div class="form-section-title">Account Details</div>
                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <label class="form-label">Username *</label>
                                <input v-model="form.username" type="text" class="form-control" placeholder="siddharth_iitm">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Email *</label>
                                <input v-model="form.email" type="email" class="form-control" placeholder="roll@ds.study.iitm.ac.in">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Roll Number *</label>
                                <input v-model="form.roll_no" type="text" class="form-control" placeholder="22f3002567">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Password *</label>
                                <input v-model="form.password" type="password" class="form-control" placeholder="Min 6 characters">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Confirm Password *</label>
                                <input v-model="form.confirm_password" type="password" class="form-control" placeholder="Repeat password">
                            </div>
                        </div>

                        <!-- Personal Details -->
                        <div class="form-section-title">Personal Details</div>
                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label">Full Name *</label>
                                <input v-model="form.stu_name" type="text" class="form-control" placeholder="As on official records">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Phone</label>
                                <input v-model="form.phone" type="tel" class="form-control" placeholder="10-digit mobile">
                            </div>
                            <div class="col-md-5">
                                <label class="form-label">Department</label>
                                <select v-model="form.department" class="form-select">
                                    <option value="">-- Select --</option>
                                    <option v-for="d in lookups.departments" :key="d">{{ d }}</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Degree</label>
                                <select v-model="form.degree" class="form-select">
                                    <option value="">== Select ==</option>
                                    <option v-for="d in lookups.degrees" :key="d">{{ d }}</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Grad Year</label>
                                <input v-model="form.graduation_year" type="number" class="form-control" placeholder="2026" min="2020" max="2035">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">CGPA</label>
                                <input v-model="form.cgpa" type="number" class="form-control" placeholder="8.5" step="0.01" min="0" max="10">
                            </div>
                            <div class="col-md-9">
                                <label class="form-label">Skills <small class="text-muted fw-400">(comma-separated)</small></label>
                                <input v-model="form.skills" type="text" class="form-control" placeholder="Python, Machine Learning, SQL">
                            </div>
                        </div>

                        <div class="d-flex gap-2">
                            <button class="btn btn-primary" @click="submit" :disabled="loading">
                                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                <i v-else class="bi bi-person-check-fill me-1"></i>
                                {{ loading ? 'Creating account...' : 'Create Account' }}
                            </button>
                            <router-link to="/login" class="btn btn-outline-secondary">Already registered? Login</router-link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    setup() {
        const { ref, reactive, onMounted } = Vue;
        const router = VueRouter.useRouter();
        const loading = ref(false);
        const lookups = reactive({ departments: [], degrees: [] });

        const form = reactive({
            username:'', 
            email:'', 
            password:'', 
            confirm_password:'',
            stu_name:'', 
            phone:'', 
            roll_no:'', 
            department:'', 
            degree:'',
            graduation_year:'', 
            cgpa:'', 
            skills:''
        });

        onMounted(async () => {
            try {
                const res = await API.student.lookups();
                Object.assign(lookups, res.data.data);
            } catch(e) {}
        });

        async function submit() {
            if (!form.username || !form.email || !form.password || !form.stu_name || !form.roll_no)
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
                Store.handleApiError(e, 'Registration failed.');
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
    <div class="container py-4">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="ppa-card">
                    <div class="card-body p-4">
                        <div class="mb-4">
                            <h3 class="fw-700 mb-1 text-success">
                                <i class="bi bi-building-fill me-2"></i>Company Registration
                            </h3>
                            <p class="text-muted small mb-2">Register your company to post placement drives.</p>
                            <div class="alert alert-warning small py-2 mb-0">
                                <i class="bi bi-clock me-1"></i>
                                Your registration will be reviewed by the Placement Cell before you can post drives.
                            </div>
                        </div>

                        <div class="form-section-title">Account Credentials</div>
                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label">Username *</label>
                                <input v-model="form.username" class="form-control" placeholder="google_hr">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Email *</label>
                                <input v-model="form.email" type="email" class="form-control" placeholder="hr@company.com">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Password *</label>
                                <input v-model="form.password" type="password" class="form-control" placeholder="Min 6 characters">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Confirm Password *</label>
                                <input v-model="form.confirm_password" type="password" class="form-control">
                            </div>
                        </div>

                        <div class="form-section-title">Company Information</div>
                        <div class="row g-3 mb-4">
                            <div class="col-md-8">
                                <label class="form-label">Company Name *</label>
                                <input v-model="form.company_name" class="form-control" placeholder="Google India Pvt. Ltd.">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Industry</label>
                                <select v-model="form.industry" class="form-select">
                                    <option value="">-- Select --</option>
                                    <option v-for="i in industries" :key="i">{{ i }}</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Location / HQ</label>
                                <input v-model="form.location" class="form-control" placeholder="Bengaluru, Karnataka">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Website</label>
                                <input v-model="form.website" type="url" class="form-control" placeholder="https://company.com">
                            </div>
                            <div class="col-12">
                                <label class="form-label">Company Description</label>
                                <textarea v-model="form.description" class="form-control" rows="3" placeholder="Brief description of your company..."></textarea>
                            </div>
                        </div>


                        <div class="form-section-title">HR Point of Contact</div>
                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label">HR Name</label>
                                <input v-model="form.hr_name" class="form-control" placeholder="Priya Sharma">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">HR Contact</label>
                                <input v-model="form.hr_contact" class="form-control" placeholder="Phone or email">
                            </div>
                        </div>


                        <div class="d-flex gap-2">
                            <button class="btn btn-success" @click="submit" :disabled="loading">
                                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                <i v-else class="bi bi-send me-1"></i>
                                {{ loading ? 'Submitting...' : 'Submit for Approval' }}
                            </button>
                            <router-link to="/login" class="btn btn-outline-secondary">Already registered? Login</router-link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    setup() {
        const { ref, reactive } = Vue;
        const router = VueRouter.useRouter();
        const loading = ref(false);

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
            username:'',
            email:'', 
            password:'', 
            confirm_password:'',
            company_name:'', 
            industry:'', 
            location:'', 
            website:'', 
            description:'',
            hr_name:'', 
            hr_contact:''
        });

        async function submit() {
            if (!form.username || !form.email || !form.password || !form.company_name)
                return Store.Toast.warning('Please fill all required fields (*).');


            if (form.password !== form.confirm_password)
                return Store.Toast.warning('Passwords do not match.');


            loading.value = true;
            try {
                await API.auth.registerCompany(form);
                Store.Toast.success('Registration submitted! Awaiting admin approval.');
                router.push('/login');

            } catch(e) {
                Store.handleApiError(e, 'Registration failed.');
            } finally {
                loading.value = false;
            }
        }

        return { form, industries, loading, submit };
    }
};
