window.AppNavbar = {
    name: 'AppNavbar',
    template: `
    <nav style="padding: 10px 20px; border-bottom: 1px solid #ccc; display: flex; align-items: center; justify-content: space-between;">

        <div>
            <router-link to="/" style="font-size: 1.2rem; font-weight: bold; text-decoration: none;">
                PlaceIITM
            </router-link>
        </div>

        <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">

            <!-- Admin links -->
            <template v-if="isAdmin">
                <router-link to="/admin/dashboard">Dashboard</router-link>
                <router-link to="/admin/companies">Companies</router-link>
                <router-link to="/admin/students">Students</router-link>
                <router-link to="/admin/drives">Drives</router-link>
                <router-link to="/admin/applications">Applications</router-link>
                <router-link to="/admin/reports">Reports</router-link>
            </template>

            <!-- Company links -->
            <template v-else-if="isCompany">
                <router-link to="/company/dashboard">Dashboard</router-link>
                <router-link to="/company/drives/new">Post Drive</router-link>
                <router-link to="/company/profile">Profile</router-link>
            </template>

            <!-- Student links -->
            <template v-else-if="isStudent">
                <router-link to="/student/dashboard">Dashboard</router-link>
            </template>

            <!-- Guest links -->
            <template v-else>
                <router-link to="/login">Login</router-link>
                <router-link to="/register/student">Register as Student</router-link>
                <router-link to="/register/company">Register as Company</router-link>
            </template>

            <!-- Logout -->
            <span v-if="isLoggedIn">
                | <button @click="logout" style="cursor: pointer;">Logout</button>
            </span>

        </div>
    </nav>
    `,
    setup() {
        const { computed } = Vue;
        const router = VueRouter.useRouter();

        const isLoggedIn = computed(() => Store.Auth.state.isLoggedIn);
        const isAdmin = computed(() => Store.Auth.isAdmin);
        const isCompany = computed(() => Store.Auth.isCompany);
        const isStudent = computed(() => Store.Auth.isStudent);

        function logout() {
            Store.Auth.logout();
            Store.Toast.info('Logged out successfully.');
            router.push('/login');
        }

        return { isLoggedIn, isAdmin, isCompany, isStudent, logout };
    }
};


window.NotFoundPage = {
    name: 'NotFoundPage',
    template: `
    <div style="padding: 40px; text-align: center;">
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <router-link to="/">Go Home</router-link>
    </div>
    `
};
