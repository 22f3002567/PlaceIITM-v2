const { createRouter, createWebHashHistory } = VueRouter;

const routes = [

    {
        path: '/',
        component: window.LandingPage,
        meta: { title: "PlaceIITM - My Campus Placement Portal V2" }
    },
    {
        path: '/login',
        component: window.LoginPage,
        meta: { requiresGuest: true, title: "PlaceIITM - Sign In" }
    },
    {
        path: '/register/student',
        component: window.RegisterStudentPage,
        meta: { requiresGuest: true, title: "Student Register - PlaceIITM" }
    },
    {
        path: '/register/company',
        component: window.RegisterCompanyPage,
        meta: { requiresGuest: true, title: "Company Register - PlaceIITM" }
    },

    {
        path: '/admin/dashboard',
        component: window.AdminDashboard,
        meta: { requiresAuth: true, role: 'admin', title: "PlaceIITM - Admin Dashboard" }
    },

    {
        path: '/admin/companies',
        component: window.AdminCompanies,
        meta: { requiresAuth: true, role: 'admin' }

    },
    
    {
        path: '/admin/students',
        component: window.AdminStudents, 
        meta: { requiresAuth: true, role: 'admin' }
    },

    {
        path: '/admin/drives',
        component: window.AdminDrives, 
        meta: { requiresAuth: true, role: 'admin'}
    },

    {
        path: '/admin/applications',
        component: window.AdminApplications,
        meta: { requiresAuth: true, role: 'admin'}
        
    },

    {
        path: '/admin/reports',
        component: window.AdminReports,
        meta: {requiresAuth: true, role:'admin'}
    },
    {
        path: '/company/dashboard',
        component: window.CompanyDashboard,
        meta: { requiresAuth: true, role: 'company', title: "PlaceIITM - Company Dashboard" }

    },

    { 
        path: '/company/profile',                     
        component: window.CompanyProfile,        
        meta: { requiresAuth: true, role: 'company' } 
    },
    { 
        path: '/company/drives',                      
        component: window.CompanyDriveList,      
        meta: { requiresAuth: true, role: 'company' } 
    },
    { 
        path: '/company/drives/new',                  
        component: window.CompanyDriveForm,      
        meta: { requiresAuth: true, role: 'company' } 
    },
    { 
        path: '/company/drives/:id/edit',             
        component: window.CompanyDriveForm,      
        meta: { requiresAuth: true, role: 'company' } 
    },

    { 
        path: '/company/drives/:id/applicants',       
        component: window.CompanyDriveApplicants,
        meta: { requiresAuth: true, role: 'company' } 
    },


    {
        path: '/student/dashboard',
        component: window.StudentDashboard,
        meta: { requiresAuth: true, role: 'student', title: "PlaceIITM - Student Dashboard" }
    },
    { 
        path: '/student/drives', 
        component: window.StudentBrowseDrives, 
        meta: { requiresAuth: true, role: 'student' } 
    },
    { 
        path: '/student/applications', 
        component: window.StudentMyApplications, 
        meta: { requiresAuth: true, role: 'student' } 
    },
    { 
        path: '/student/history',      
        component: window.StudentHistory, 
        meta: { requiresAuth: true, role: 'student' } 
    },
    { 
        path: '/student/profile', 
        component: window.StudentProfile, 
        meta: { requiresAuth: true, role: 'student' } 
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
    scrollBehavior: () => ({ top: 0 })
});


//Navigation Guards
router.beforeEach((to, from, next) => {
    // Update page title
    document.title = to.meta.title || 'PlaceIITM';

    const { isLoggedIn, user } = Store.Auth.state;
    const userRole = user?.role;

    // Logged-in users should not see login/register pages
    if (to.meta.requiresGuest && isLoggedIn) {
        return next(_dashboardFor(userRole));
    }

    // Protected route must be logged in
    if (to.meta.requiresAuth && !isLoggedIn) {
        return next('/login');
    }

    // Role check ;-user is logged in but wrong role
    if (to.meta.role && userRole !== to.meta.role) {
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