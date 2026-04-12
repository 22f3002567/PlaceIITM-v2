// shared/Navbar.js

window.AppNavbar = {
    name: 'AppNavbar',
    template: `
    <nav class="navbar navbar-expand-lg ppa-navbar">
        <div class="container">
            <router-link class="navbar-brand" to="/">
                <i class="bi bi-mortarboard-fill me-2"></i>PlaceIITM
            </router-link>

            <button class="navbar-toggler border-0" type="button"
                    data-bs-toggle="collapse" data-bs-target="#navMain">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse" id="navMain">
                <ul class="navbar-nav ms-auto align-items-center gap-1">

                    <!-- Admin links -->
                    <template v-if="isAdmin">
                        <li class="nav-item"><router-link class="nav-link" to="/admin/dashboard">Dashboard</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/admin/companies">Companies</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/admin/students">Students</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/admin/drives">Drives</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/admin/applications">Applications</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/admin/reports">Reports</router-link></li>
                    </template>

                    <!-- Company links -->
                    <template v-else-if="isCompany">
                        <li class="nav-item"><router-link class="nav-link" to="/company/dashboard">Dashboard</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/company/drives/new">Post Drive</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/company/profile">Profile</router-link></li>
                    </template>

                    <!-- Student links -->
                    <template v-else-if="isStudent">
                        <li class="nav-item"><router-link class="nav-link" to="/student/dashboard">Dashboard</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/student/drives">Browse Drives</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/student/applications">Applications</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/student/history">History</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/student/profile">Profile</router-link></li>
                    </template>

                    <!-- Guest links -->
                    <template v-else>
                        <li class="nav-item"><router-link class="nav-link" to="/login">Login</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/register/student">Register Student</router-link></li>
                        <li class="nav-item"><router-link class="nav-link" to="/register/company">Register Company</router-link></li>
                    </template>

                    <!-- Logout (if logged in) -->
                    <li v-if="isLoggedIn" class="nav-item ms-2">
                        <button class="btn btn-outline-danger btn-sm" @click="logout">
                            <i class="bi bi-box-arrow-right me-1"></i>Logout
                        </button>
                    </li>

                </ul>
            </div>
        </div>
    </nav>
    `,
    setup() {
        const { ref, computed } = Vue;
        const router = VueRouter.useRouter();

        const isLoggedIn = computed(() => Store.Auth.state.isLoggedIn);
        const isAdmin = computed(() => Store.Auth.isAdmin);
        const isCompany = computed(() => Store.Auth.isCompany);
        const isStudent = computed(() => Store.Auth.isStudent);

        function logout() {
            Store.Auth.logout();
            Store.Toast.info('You have been logged out. See you soon!');
            router.push('/login');
        }

        return { isLoggedIn, isAdmin, isCompany, isStudent, logout };
    }
};

//shared/NotFound.js

window.NotFoundPage = {
    name: 'NotFoundPage',
    template: `
    <div class="container text-center py-5 mt-5">
        <div style="font-size:5rem; opacity:0.12;" class="mb-3">
            <i class="bi bi-compass"></i>
        </div>
        <h1 class="fw-700 mb-2" style="font-size:2rem;">404 -::- Page Not Found</h1>
        <p class="text-muted mb-4">The page you are looking for doesn't exist or has moved.</p>
        <router-link to="/" class="btn btn-primary">
            <i class="bi bi-house me-1"></i>Go Home
        </router-link>
    </div>
    `
};
