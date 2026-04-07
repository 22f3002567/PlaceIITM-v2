const { createRouter, createWebHistory } = VueRouter;

const routes = [

    {
        path: '/',
        name: 'Home',
        component: window.LandingPage,
        meta: { title: "PlaceIITM - My Campus Placement Portal V2" }
    },
    {
        path: '/login',
        name: 'Login',
        component: window.LoginPage,
        meta: { requiresGuest: true, title: "PlaceIITM - Sign In" }
    },
    {
        path: '/register/student',
        name: 'Student Register',
        component: window.RegisterStudentPage,
        meta: { requiresGuest: true, title: "Student Register - PlaceIITM" }
    },
    {
        path: '/register/company',
        name: 'Company Register',
        component: window.RegisterCompanyPage,
        meta: { requiresGuest: true, title: "Company Register - PlaceIITM" }
    },

    {
        path: '/admin/dashboard',
        name: 'Admin Dashboard',
        component: window.AdminDashboard,
        meta: { requiresAuth: true, role: 'admin', title: "PlaceIITM - Admin Dashboard" }
    },

    {
        path: '/company/dashboard',
        name: 'Company Dashboard',
        component: window.CompanyDashboard,
        meta: { requiresAuth: true, role: 'company', title: "PlaceIITM - Company Dashboard" }

    },

    {
        path: '/student/dashboard',
        name: 'Student Dashboard',
        component: window.StudentDashboard,
        meta: { requiresAuth: true, role: 'student', title: "PlaceIITM - Student Dashboard" }
    }

];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior() {
        return { top: 0 };
    }
});


window.AppRouter = router;