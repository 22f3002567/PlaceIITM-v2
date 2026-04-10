const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000
});

//Request interceptor - attach access token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}, error => Promise.reject(error));


//Response interceptor;- handle 401, auto-refresh
let _isRefreshing = false;
let _refreshQueue = [];   // callbacks waiting for the new token

const processQueue = (error, token = null) => {
    _refreshQueue.forEach(cb => error ? cb.reject(error) : cb.resolve(token));
    _refreshQueue = [];
};

api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            const refreshToken = localStorage.getItem('refresh_token');

            if (!refreshToken) {
                // No refresh token --> force logout
                _clearTokens();
                window.location.hash = '#/login';
                return Promise.reject(error);
            }

            if (_isRefreshing) {
                // Already refreshing - queue this request
                return new Promise((resolve, reject) => {
                    _refreshQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            _isRefreshing = true;

            try {
                const res = await axios.post(`${API_BASE}/auth/refresh`, {}, {
                    headers: { 'Authorization': `Bearer ${refreshToken}` }
                });
                const newToken = res.data.data.access_token;
                localStorage.setItem('access_token', newToken);
                api.defaults.headers['Authorization'] = `Bearer ${newToken}`;
                processQueue(null, newToken);
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                _clearTokens();
                window.location.hash = '#/login';
                return Promise.reject(refreshError);
            } finally {
                _isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);


function _clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
}


//Exported API methods (organized by role) 

window.API = {

    // Auth
    auth: {
        login: (data) => api.post('/auth/login', data),
        refresh: () => api.post('/auth/refresh'),
        me: () => api.get('/auth/me'),
        registerStudent: (data) => api.post('/auth/register/student', data),
        registerCompany: (data) => api.post('/auth/register/company', data),
    },

    // Admin
    admin: {
        dashboard: () => api.get('/admin/dashboard'),
        lookups: () => api.get('/admin/lookups'),

        getCompanies: (params) => api.get('/admin/companies', { params }),
        approveCompany: (id) => api.post(`/admin/companies/${id}/approve`),
        rejectCompany: (id) => api.post(`/admin/companies/${id}/reject`),
        blacklistCompany: (id) => api.post(`/admin/companies/${id}/blacklist`),
        deleteCompany: (id) => api.delete(`/admin/companies/${id}`),
        editCompany: (id, data) => api.put(`/admin/companies/${id}`, data),

        getStudents: (params) => api.get('/admin/students', { params }),
        editStudent: (id, data) => api.put(`/admin/students/${id}`, data),
        blacklistStudent:(id) => api.post(`/admin/students/${id}/blacklist`),
        deleteStudent: (id) => api.delete(`/admin/students/${id}`),

        getDrives: (params) => api.get('/admin/drives', { params }),
        approveDrive: (id) => api.post(`/admin/drives/${id}/approve`),
        rejectDrive: (id) => api.post(`/admin/drives/${id}/reject`),
        closeDrive: (id) => api.post(`/admin/drives/${id}/close`),

        getApplications: (params) => api.get('/admin/applications', { params }),
        getStats: () => api.get('/admin/stats'),
    },

    // Company
    company: {
        dashboard: () => api.get('/company/dashboard'),
        lookups: () => api.get('/company/lookups'),

        getProfile: () => api.get('/company/profile'),
        updateProfile: (data) => api.put('/company/profile', data),

        createDrive: (data) => api.post('/company/drives', data),
        editDrive: (id, data) => api.put(`/company/drives/${id}`, data),
        closeDrive: (id) => api.post(`/company/drives/${id}/close`),
        deleteDrive: (id) => api.delete(`/company/drives/${id}`),

        getDriveApplicants: (id, params) => api.get(`/company/drives/${id}/applications`, { params }),
        updateApplication: (id, data) => api.put(`/company/applications/${id}`, data),
    },

    // Student
    student: {
        dashboard: () => api.get('/student/dashboard'),
        lookups: () => api.get('/student/lookups'),

        getDrives: (params) => api.get('/student/drives', { params }),
        applyToDrive: (id) => api.post(`/student/drives/${id}/apply`),

        getApplications: (params) => api.get('/student/applications', { params }),
        getHistory: () => api.get('/student/history'),

        getProfile: () => api.get('/student/profile'),
        updateProfile: (data) => api.put('/student/profile', data),
        uploadResume: (formData) => api.post('/student/profile/resume', formData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        }),

        triggerExport: () => api.post('/student/export'),
        exportStatus: (jobId) => api.get(`/student/export/${jobId}`),
    },

    // File URLs
    resumeUrl: (filename) => `/api/resumes/${filename}`,
    exportUrl: (filename) => `/api/exports/${filename}`
};
