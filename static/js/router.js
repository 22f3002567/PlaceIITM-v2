const { createRouter, createWebHistory } = VueRouter;

const routes = [

    {
        path: '/',
        
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
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: window.NotFoundPage,
        meta: { title: "404 Not Found - PlaceIITM" }
    }


];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior() {
        return { top: 0 };
    }
});

router.beforeEach((to, form, next) => {
    document.title = to.meta.title || "PlaceIITM";

    const { isLoggedIn, user } = Store.Auth.stage;
    const userRole = user?.role;

    if (to.meta.requiresGuest && isLoggedIn) {
        return next(_dashboardFor(userRole));
    }

    if (to.meta.requiresAuth && !isLoggedIn) {
        return next('/login');
    }

    if (to.meta.role && to.meta.role !== userRole) {
        return next(_dashboardFor(userRole));
    
    }
    next();
});

function _dashboardFor(role) {
    switch(role) {
        case 'admin': return '/admin/dashboard';
        case 'company': return '/company/dashboard';
        case 'student': return '/student/dashboard';
        default: return '/';
    }
}

    // const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    // const requiresGuest = to.matched.some(record => record.meta.requiresGuest);
    // const requiredRole = to.matched.find(record => record.meta.role)?.meta.role;


window.AppRouter = router;