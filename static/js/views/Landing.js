//Landing.js - The landing page component for PlaceIITM, showcasing features and guiding users to register or access their dashboard.   
window.LandingPage = {
    name: 'LandingPage',
    template: `
    <div>
        <section>
            <div style="text-align:center;">
                <h1>PlaceIITM</h1>
                <p>
                    Where talent meets opportunity. The official campus placement portal
                    connecting IIT students with top recruiters across India.
                </p>

                <template v-if="isLoggedIn">
                    <router-link :to="dashboardLink">Go to Dashboard</router-link>
                </template>

                <template v-else>
                    <router-link to="/register/student">Register as Student</router-link>
                    <router-link to="/register/company">Register Company</router-link>
                </template>
            </div>
        </section>

        <div>
            <div v-for="card in featureCards" :key="card.title">
                <h3>{{ card.title }}</h3>
                <p>{{ card.desc }}</p>
                <router-link :to="card.link">{{ card.cta }}</router-link>
            </div>

            <div>
                <h3>How It Works</h3>
                <div v-for="step in howItWorks" :key="step.step">
                    <strong>{{ step.step }}. {{ step.title }}</strong>
                    <p>{{ step.desc }}</p>
                </div>
            </div>
        </div>

        <footer>
            PlaceIITM V2 — Campus Placement Portal © 2026
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
            {
                title: 'For Students',
                desc: 'Build profile, upload resume, browse drives.',
                link: '/register/student',
                cta: 'Register Now'
            },
            {
                title: 'For Companies',
                desc: 'Post drives and manage hiring.',
                link: '/register/company',
                cta: 'Register Company'
            },
            {
                title: 'For Admin',
                desc: 'Manage students, companies, analytics.',
                link: '/login',
                cta: 'Admin Login'
            }
        ];

        const howItWorks = [
            { step:1, title:'Register', desc:'Create account' },
            { step:2, title:'Approve', desc:'Admin approval' },
            { step:3, title:'Post Drive', desc:'Companies post jobs' },
            { step:4, title:'Apply', desc:'Students apply' }
        ];

        return { isLoggedIn, dashboardLink, featureCards, howItWorks };
    }
};


//auth/Login.js - The login component for PlaceIITM, allowing users to authenticate and access their dashboard.

window.LoginPage = {
    name: 'LoginPage',
    template: `
    <div>
        <h2>Login</h2>

        <div>
            <label>Select Role:</label>
            <div v-for="r in roles" :key="r.value">
                <input type="radio" v-model="form.role" :value="r.value"> {{ r.label }}
            </div>
        </div>

        <div>
            <input v-model="form.email" placeholder="Email">
        </div>

        <div>
            <input v-model="form.passwd" type="password" placeholder="Password">
        </div>

        <div v-if="errorMsg">{{ errorMsg }}</div>

        <button @click="submit">Sign In</button>

        <p>
            <router-link to="/register/student">Student Register</router-link>
            <router-link to="/register/company">Company Register</router-link>
        </p>
    </div>
    `,
    setup() {
        const { ref, reactive } = Vue;
        const router = VueRouter.useRouter();

        const loading = ref(false);
        const errorMsg = ref('');

        const form = reactive({
            email: '',
            password: '',
            role: 'student'
        });

        const roles = [
            { value:'student', label:'Student' },
            { value:'company', label:'Company' },
            { value:'admin', label:'Admin' }
        ];

        async function submit() {
            errorMsg.value = '';
            loading.value = true;

            try {
                const res = await API.auth.login(form);
                const { access_token, refresh_token, user } = res.data.data;

                Store.Auth.login(user, access_token, refresh_token);

                const dest = {
                    admin:'/admin/dashboard',
                    company:'/company/dashboard',
                    student:'/student/dashboard'
                };

                router.push(dest[user.role] || '/');
            } catch(e) {
                errorMsg.value = 'Login failed';
            } finally {
                loading.value = false;
            }
        }

        return { form, roles, errorMsg, submit };
    }
};


//auth/RegisterCompany.js - The company registration component for PlaceIITM, allowing companies to sign up and await admin approval.

window.RegisterCompanyPage = {
    name: 'RegisterCompanyPage',
    template: `
    <div>
        <h2>Company Registration</h2>

        <input v-model="form.username" placeholder="Username">
        <input v-model="form.email" placeholder="Email">

        <input v-model="form.password" type="password" placeholder="Password">
        <input v-model="form.confirm_password" type="password" placeholder="Confirm Password">

        <input v-model="form.company_name" placeholder="Company Name">
        <input v-model="form.industry" placeholder="Industry">
        <input v-model="form.location" placeholder="Location">

        <input v-model="form.website" placeholder="Website">
        <textarea v-model="form.description" placeholder="Description"></textarea>

        <input v-model="form.hr_name" placeholder="HR Name">
        <input v-model="form.hr_contact" placeholder="HR Contact">

        <button @click="submit">Submit</button>
    </div>
    `,
    setup() {
        const { ref, reactive } = Vue;
        const router = VueRouter.useRouter();

        const loading = ref(false);

        const form = reactive({
            username:'', email:'', password:'', confirm_password:'',
            company_name:'', industry:'', location:'', website:'',
            description:'', hr_name:'', hr_contact:''
        });

        async function submit() {
            if (form.password !== form.confirm_password) {
                alert('Passwords do not match');
                return;
            }

            loading.value = true;

            try {
                await API.auth.registerCompany(form);
                alert('Submitted for approval');
                router.push('/login');
            } finally {
                loading.value = false;
            }
        }

        return { form, submit };
    }
};



// auth/RegisterStudent.js - The student registration component for PlaceIITM, allowing students to create an account and access placement opportunities.
window.RegisterStudentPage = {
    name: 'RegisterStudentPage',
    template: `
    <div>
        <h2>Student Registration</h2>

        <input v-model="form.username" placeholder="Username">
        <input v-model="form.email" placeholder="Email">
        <input v-model="form.roll_no" placeholder="Roll Number">

        <input v-model="form.password" type="password" placeholder="Password">
        <input v-model="form.confirm_password" type="password" placeholder="Confirm Password">

        <input v-model="form.full_name" placeholder="Full Name">
        <input v-model="form.phone" placeholder="Phone">

        <input v-model="form.department" placeholder="Department">
        <input v-model="form.degree" placeholder="Degree">

        <input v-model="form.graduation_year" placeholder="Year">
        <input v-model="form.cgpa" placeholder="CGPA">

        <input v-model="form.skills" placeholder="Skills">

        <button @click="submit">Create Account</button>
    </div>
    `,
    setup() {
        const { ref, reactive } = Vue;
        const router = VueRouter.useRouter();

        const loading = ref(false);

        const form = reactive({
            username:'', email:'', password:'', confirm_password:'',
            full_name:'', phone:'', roll_no:'',
            department:'', degree:'',
            graduation_year:'', cgpa:'', skills:''
        });

        async function submit() {
            if (form.password !== form.confirm_password) {
                alert('Passwords do not match');
                return;
            }

            loading.value = true;

            try {
                await API.auth.registerStudent(form);
                alert('Account created');
                router.push('/login');
            } finally {
                loading.value = false;
            }
        }

        return { form, submit };
    }
};

